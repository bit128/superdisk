/**
 * web服务
 */
var fs = require('fs')
    ,os = require('os')
    ,path = require('path')
    ,mime = require('mime')
    ,config = JSON.parse(fs.readFileSync('config/main.json'))
    ,body_parse = require('body-parser')
    ,express = require('express');
app = express();
app.listen(config.web)
//设置中间件
app.use(express.static('statics'));
app.use(body_parse.json());
app.use(body_parse.urlencoded({extended: true}));
app.use(require('cookie-parser')());
//设置模版引擎
app.engine('html', function(file_path, options, callback){
    fs.readFile(file_path, function(err, data){
        fs.readFile('views/_layout.html', function(err, layout){
            var content = layout.toString().replace('#content#', data.toString());
            if (options.data) {
                for (key in options.data) {
                    content = content.replace(new RegExp('#'+key+'#', 'g'), options.data[key]);
                }
            }
            return callback(null, content);
        });
    });
});
app.set('views', './views');
app.set('view engine', 'html');
//页面公共数据
var page_data = {
    data: {
        version: '1.2.0 beta'
    }
};
/* ------ 页面路由规则 ------ */
//网盘首页
app.get('/', function(req, res){
    if (! req.cookies.account) {
        res.redirect('/login.page');
        return;
    }
    page_data.data.nav = 0;
    page_data.data.socket_link = config.ip+':'+config.upload;
    res.render('index', page_data);
});
//配置页面
app.get('/config.page', function(req, res){
    if (! req.cookies.account) {
        res.redirect('/login.page');
        return;
    }
    page_data.data.nav = 1;
    res.render('config', page_data);
});
//用户管理页面
app.get('/user.page', function(req, res){
    if (! req.cookies.account) {
        res.redirect('/login.page');
        return;
    }
    page_data.data.nav = 2;
    res.render('user', page_data);
});
//登录页面
app.get('/login.page', function(req, res){
    res.clearCookie('account');
    res.clearCookie('token');
    res.clearCookie('role');
    fs.readFile('views/login.html', function(err, data){
        res.send(data.toString());
    });
});
/* ------ 动作路由规则 ------ */
//登录动作
app.post('/login.action', function(req, res){
    var account = req.body.account;
    if (account) {
        var user_list = JSON.parse(fs.readFileSync('config/user.json'));
        if (user_list[req.body.account]) {
            var user = user_list[req.body.account];
            if (user.stat) {
                var exp = new Date(user.exp);
                if (new Date().getTime() < exp.getTime()) {
                    user.token = require('crypto')
                        .createHash('md5')
                        .update(account + Math.random())
                        .digest('hex');
                    user.ltime = new Date();
                    user_list[req.body.account] = user;
                    fs.writeFile('config/user.json', JSON.stringify(user_list), function(err){
                        res.json({code: 100, result: {
                            account: account,
                            token: user.token,
                            role: user.role
                        }, error: null});
                    });
                } else {
                    res.json({code: 101, result: null, error: '帐号已过期'});
                }
            } else {
                res.json({code: 102, result: null, error: '帐号被冻结'});
            }
        } else {
            res.json({code: 103, result: null, error: '帐号不存在'});
        }
    } else {
        res.json({code: 104, result: null, error: '帐号不能为空'});
    }
});
//用户实体动作
app.post('/user.action', function(req, res){
    fs.readFile('config/user.json', function(err, data){
        var user_list = JSON.parse(data);
        var opt_user = user_list[req.body.account];
        if (opt_user && opt_user.token == req.body.token) {
            switch (req.body.action) {
                case 'update':
                    if (opt_user.role & 1) {
                        var user = user_list[req.body.user_account];
                        if (user) {
                            user.role = parseInt(req.body.user_role);
                            user.exp = new Date(req.body.user_exp);
                            user_list[req.body.user_account] = user;
                            fs.writeFile('config/user.json', JSON.stringify(user_list), function(err){
                                res.json({code: 100, result: 'ok', error: null});
                            });
                        } else {
                            user_list[req.body.user_account] = {
                                password: req.body.user_password,
                                token: '',
                                role: parseInt(req.body.user_role),
                                stat: true,
                                exp: new Date(req.body.user_exp),
                                ltime: new Date()
                            }
                            fs.writeFile('config/user.json', JSON.stringify(user_list), function(err){
                                res.json({code: 100, result: 'ok', error: null});
                            });
                        }
                    } else {
                        res.json({code: 101, result: null, error: '您没有设置帐号的权限'});
                    }
                    break;
                case 'set_status':
                    if (opt_user.role & 1) {
                        var user = user_list[req.body.user_account];
                        if (user) {
                            user.stat = req.body.user_status == '1' ? true : false;
                            user_list[req.body.user_account] = user;
                            fs.writeFile('config/user.json', JSON.stringify(user_list), function(err){
                                res.json({code: 100, result: 'ok', error: null});
                            });
                        } else {
                            res.json({code: 101, result: null, error: '帐号不存在'});
                        }
                    } else {
                        res.json({code: 101, result: null, error: '您没有设置帐号的权限'});
                    }
                    break;
                case 'get':
                    var user = user_list[req.body.user_account];
                    if (user) {
                        res.json({code: 100, result: {
                            account: req.body.user_account,
                            role: user.role,
                            exp: user.exp,
                            stat: user.stat,
                            ltime: user.ltime
                        }, error: null});
                    } else {
                        res.json({code: 101, result: null, error: '帐号不存在'});
                    }
                    break;
                case 'getList':
                    var result = [];
                    for (user in user_list) {
                        info = user_list[user];
                        result.push({
                            account: user,
                            role: info.role,
                            exp: info.exp,
                            stat: info.stat,
                            ltime: info.ltime
                        });
                    }
                    res.json({code: 100, result: result, error: null});
                    break;
                case 'delete':
                    if (opt_user.role & 1) {
                        if (user_list[req.body.user_account]) {
                            delete user_list[req.body.user_account];
                            fs.writeFile('config/user.json', JSON.stringify(user_list), function(err){
                                res.json({code: 100, result: 'ok', error: null});
                            });
                        } else {
                            res.json({code: 101, result: null, error: '帐号不存在'});
                        }
                    } else {
                        res.json({code: 101, result: null, error: '您没有删除帐号的权限'});
                    }
                    break;
            }
        } else {
            res.json({code: 106, result: null, error: '需要登录，或者您的登录状态已经过期'});
        }
    });
});
//网盘配置动作
app.post('/config.action', function(req, res){
    var opt_user = JSON.parse(fs.readFileSync('config/user.json'))[req.body.account];
    if (opt_user && opt_user.token == req.body.token) {
        fs.readFile('config/main.json', function(err, data){
            var config = JSON.parse(data);
            switch (req.body.action) {
                case 'info':
                    config.ip = JSON.stringify(os.networkInterfaces()).match(/192\.168\.\d+\.\d+/)[0];
                    fs.writeFileSync('config/main.json', JSON.stringify(config));
                    res.json({code: 100, result: config, error: null});
                    break;
                case 'setInfo':
                    if (opt_user.role & 1) {
                        config[req.body.field] = req.body.value;
                        fs.writeFile('config/main.json', JSON.stringify(config), function(err){
                            if (err) {
                                res.json({code: 100, result: null, error: err.toString()});
                            } else {
                                res.json({code: 100, result: 'ok', error: null});
                            }
                        });
                    } else {
                        res.json({code: 101, result: null, error: '您没有删除帐号的权限'});
                    }
                    break;
            }
        });
    } else {
        res.json({code: 106, result: null, error: '需要登录，或者您的登录状态已经过期'})
    }
});
//网盘实体动作
app.post('/disk.action', function(req, res){
    var opt_user = JSON.parse(fs.readFileSync('config/user.json'))[req.body.account];
    if (opt_user && opt_user.token == req.body.token) {
        var root_path = config.root_path;
        var storage = require('./storage').storage;
        switch (req.body.action) {
            case 'newFolder':
                storage.newFolder(req.body.path, root_path, function(err, result){
                    if (result) {
                        res.json({code: 100, result: result, error: null});
                    } else {
                        res.json({code: 101, result: null, error: err});
                    }
                });
                break;
            case 'dir':
                storage.dir({
                    path: req.body.path,
                    type: req.body.type,
                    sort: req.body.sort,
                    keyword: req.body.keyword
                }, root_path, function(result){
                    res.json({code: 100, result: result, error: null});
                });
                break;
            case 'rename':
                if (opt_user.role & 4) {
                    storage.rename({
                        file_name: req.body.file_name,
                        new_name: req.body.new_name
                    }, root_path, function(err, result){
                        if (result) {
                            res.json({code: 100, result: result, error: null});
                        } else {
                            res.json({code: 101, result: null, error: err});
                        }
                    });
                } else {
                    res.json({code: 101, result: null, error: '您没有重命名文件的权限'});
                }
                break;
            case 'move':
                if (opt_user.role & 4) {
                    storage.move({
                        path: req.body.path,
                        new_path: req.body.new_path,
                        file_name: req.body.file_name
                    }, root_path, function(){
                        res.json({code: 100, result: 'ok', error: null});
                    });
                } else {
                    res.json({code: 101, result: null, error: '您没有移动文件的权限'});
                }
                break;
            case 'remove':
                if (opt_user.role & 4) {
                    storage.remove(req.body.path, root_path, function(err, result){
                        if (result) {
                            res.json({code: 100, result: result, error: null});
                        } else {
                            res.json({code: 101, result: null, error: err});
                        }
                    });
                } else {
                    res.json({code: 101, result: null, error: '您没有删除文件的权限'});
                } 
                break;
        }
    } else {
        res.json({code: 106, result: null, error: '需要登录，或者您的登录状态已经过期'})
    }
});
//文件预览动作
app.get('/reader.action/*', function(req, res){
    var file_path = req.path.substring(14);
    if (file_path) {
        var full_path = path.join(config.root_path, decodeURI(file_path));
        fs.readFile(full_path, function(err, data){
            if (err) {
                res.send(err.toString());
            } else {
                var mimes = mime.lookup(file_path);
                res.set('Content-type', mimes);
                res.send(data);
            }
        });
    } else {
        res.send('');
    }
});
//文件下载动作
app.get('/download.action/*', function(req, res){
    var file_path = req.path.substring(16);
    if (file_path) {
        var full_path = path.join(config.root_path, decodeURI(file_path));
        fs.readFile(full_path, function(err, data){
            if (err) {
                res.send(err.toString());
            } else {
                res.send(data);
            }
        });
    } else {
        res.send('');
    }
});