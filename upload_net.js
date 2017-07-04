/**
 * 文件上传服务 - 标准socket
 * ======
 * @author 洪波
 * @version 17.06.26
 */
var fs = require('fs')
    ,path = require('path');
require('net').createServer(function(socket){
    console.log('----> client online.', new Date().toLocaleString());
    var target = '';
    socket.on('data', function(msg){
        if (target) {
            console.log('---->',msg);
            fs.appendFileSync(target, msg);
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
        console.log('----> client offline.', new Date().toLocaleString());
    });
}).listen(3008);