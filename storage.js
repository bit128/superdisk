var path = require('path')
    ,mime = require('mime')
    ,fs = require('fs');
var storage = {
    newFolder: function(file_path, root_path, callback){
        var real_path = path.join(root_path, file_path);
        var folder_name = '新建文件夹';
        var i = 0;
        while (fs.existsSync(path.join(real_path, folder_name))) {
            folder_name = '新建文件夹' + (++i);
        }
        fs.mkdir(path.join(real_path, folder_name), 0777, function(err){
            var date = new Date() / 1000;
            if (err) {
                callback(err, null);
            } else {
                callback(null, {
                    "name": folder_name,
                    "type": 'folder',
                    "size": 0,
                    "ctime": date,
                    "mtime": date
                });
            }
        });
    },
    dir: function(body, root_path, callback) {
        var real_path = path.join(root_path, body.path);
        fs.readdir(real_path, function(err, files){
            var list = [];
            var c = files.length;
            for (var i=0; i<c; i++) {
                //关键字鉴别
                if (body.keyword != '' && files[i].indexOf(body.keyword) == -1) {
                    continue;
                }
                var file_path = path.join(real_path, files[i]);
                var stat = fs.statSync(file_path)
                var type = 'folder';
                var size = 0;
                if (stat.isFile()) {
                    type = mime.lookup(file_path);
                    size = stat.size;
                }
                //类型鉴别
                if (body.type == 'folder' && type != 'folder')
                    continue;
                //返回数据
                list.push({
                    "name": files[i],
                    "type": type,
                    "size": size,
                    "ctime": stat.ctime/1000,
                    "mtime": stat.mtime/1000
                });
                //排序
                switch (parseInt(body.sort)) {
                    case 1:
                        list.sort().reverse();
                        break;
                    case 2:
                        list.sort(function(a, b){
                            return a.size - b.size;
                        });
                        break;
                    case 3:
                        list.sort(function(a, b){
                            return b.size - a.size;
                        });
                        break;
                    case 4:
                        list.sort(function(a, b){
                            return a.mtime - b.mtime;
                        });
                        break;
                    case 5:
                        list.sort(function(a, b){
                            return b.mtime - a.mtime;
                        });
                        break;
                }
            }
            callback(list);
        });
    },
    rename: function(body, root_path, callback){
        fs.rename(path.join(root_path, body.file_name),
            path.join(root_path, body.new_name),
            function(err){
                if (err) {
                    callback(err, null);
                } else {
                    callback(null, '重命名成功');
                }
            }
        );
    },
    move: function(body, root_path, callback){
        old_file = path.join(root_path, body.path, body.file_name);
        new_file = path.join(root_path, body.new_path, body.file_name);
        var is = fs.createReadStream(old_file);
        var os = fs.createWriteStream(new_file);
        is.pipe(os);
        fs.unlinkSync(old_file);
        callback('移动成功');
    },
    remove: function(file_path, root_path, callback){
        var real_path = path.join(root_path, file_path);
        if (fs.existsSync(real_path)) {
            var stat = fs.statSync(real_path);
            if (stat.isDirectory()) {
                fs.rmdir(real_path, function(err){
                    if (err) {
                        callback('删除文件夹失败，如果文件夹中有文件，需要先删除', null);
                    } else {
                        callback(null, '删除文件夹成功');
                    }
                });
            } else if (stat.isFile()) {
                fs.unlink(real_path, function(err){
                    if (err) {
                        callback(err, null);
                    } else {
                        callback(null, '删除文件成功');
                    }
                });
            }
        } else {
            callback('文件不存在', null);
        }
    },
    info: function(file_path, root_path, callback){
        var real_path = path.join(root_path, file_path);
        fs.stat(real_path, function(err, stat){
            if (err) {
                callback(err, null);
            } else {
                callback(null, {
                    "mime": mime.lookup(real_path),
                    "full_path": real_path,
                    "size": stat.size,
                    "ctime": stat.size/1000,
                    "mtime": stat.mtime/1000
                });
            }
        });
    }
};
exports.storage = storage;