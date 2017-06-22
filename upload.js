/**
 * 文件上传服务
 * ======
 * @author 洪波
 * @version 17.06.13
 */
var http = require('http')
    ,path = require('path')
    ,fs = require('fs')
    ,socketio = require('socket.io');
//任务池
var task_pool = {};

var server = http.createServer(function(req, res){
    res.writeHead(200, {'Content-type': 'text/html'});
    res.end('Web Service');
}).listen(4008, function(){
    console.log('----> Web File System on line.');
});

socketio.listen(server).on('connection', function(socket){
    console.log('----> client online.', new Date().toLocaleString());
    socket.on('message', function(msg){
        if (task_pool[socket.id]) {
            //上传中
            target = task_pool[socket.id];
            if (target) {
                fs.appendFileSync(target.target, msg);
            } else {
                socket.disconnect();
                console.log('----> 任务不存在');
            }
        } else if (msg.toString().substring(0,1) == '{') {
            var data = JSON.parse(msg);
            if (data.code == 100) {
                var config = JSON.parse(fs.readFileSync('config/main.json'));
                //新任务
                var real_path = path.join(config.root_path, data.path);
                var file_name  =data.name;
                var i = 0;
                while (fs.existsSync(path.join(real_path, file_name)))
                {
                    ++i;
                    file_name = i + data.name;
                }
                task_pool[socket.id] = {
                    "target": path.join(real_path, file_name),
                    "size": data.size,
                    "lasttime": (new Date())/1000
                };
                socket.send('ok');
                console.log('----> request: ', data.name);
            } else if (data.code == 101) {
                //结束任务
                if (task_pool[socket.id])
                    delete task_pool[socket.id];
            }    
        }
    });
    socket.on('disconnect', function(){
        delete task_pool[socket.id];
        console.log('----> client offline:',socket.id,' ', new Date().toLocaleString());
    });
});