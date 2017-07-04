/**
 * 文件上传服务 - websocket
 * ======
 * @author 洪波
 * @version 17.06.26
 */
var http = require('http')
    ,path = require('path')
    ,fs = require('fs')
    ,socketio = require('socket.io');

var server = http.createServer(function(req, res){
    res.writeHead(200, {'Content-type': 'text/html'});
    res.end('Web Service');
}).listen(4008);

socketio.listen(server).on('connection', function(socket){
    console.log('----> client online.', new Date().toLocaleString());
    var target = '';
    socket.on('message', function(msg){
        if (target) {
            fs.appendFileSync(target, msg);
        } else if (msg.toString().substring(0,1) == '{') {
            var data = JSON.parse(msg);
            if (data.code == 100) {
                var config = JSON.parse(fs.readFileSync('config/main.json'));
                //新任务
                var real_path = path.join(config.root_path, data.path);
                var file_name = data.name;
                var i = 0;
                while (fs.existsSync(path.join(real_path, file_name)))
                {
                    ++i;
                    file_name = i + data.name;
                }
                target = path.join(real_path, file_name);
                socket.send('ok');
                console.log('----> request: ', data.name);
            }    
        }
    });
    socket.on('disconnect', function(){
        console.log('----> client offline:',socket.id,' ', new Date().toLocaleString());
    });
});