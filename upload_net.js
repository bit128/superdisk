/**
 * 文件上传服务 - 标准socket
 * ======
 * @author 洪波
 * @version 17.06.26
 */
var fs = require('fs')
    ,path = require('path')
    ,server = require('net').createServer();
server.listen(3008);
server.on('connection', function(socket){
    console.log('----> client online.', new Date().toLocaleString());
    var target = '';
    var fd = null;
    socket.on('data', function(msg){
        if (target) {
            if (fd == null)
                fd = fs.openSync(target, 'a+');
            fs.writeSync(fd, msg, 0, msg.length);
            //fs.appendFileSync(target, msg);
        } else if (msg.toString().substring(0,1) == '{') {
            var data = JSON.parse(msg);
            if (data.code == 100) {
                var config = JSON.parse(fs.readFileSync('config/main.json'));
                //新任务
                var real_path = path.join(config.root_path, data.path);
                var file_name  = data.name;
                var i = 0;
                while (fs.existsSync(path.join(real_path, file_name)))
                {
                    ++i;
                    file_name = i + data.name;
                }
                target = path.join(real_path, file_name);
                socket.write("ok");
                console.log('----> request: ', data.name);
            }    
        }
    });
    socket.on('close', function(){
        if (fd != null)
            fs.closeSync(fd);
        console.log('----> client offline.', new Date().toLocaleString());
    });
});