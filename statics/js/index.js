/**
 * 网盘核心模块
 * @param {*} account 
 * @param {*} token 
 */
var Storage = function(socket_link){
    this.account = getCookie('account');
    this.token = getCookie('token');
    this.socket_link = socket_link;
    this.view = 0;
    this.sort = 0;
    this.keyword = '';
    this.menu_stack = [];
    this.menu_selector = new FileMenu(true);
    this.bindEvent();
    this.dir('');
    this.rootPath(function(root_path){
        $('#root_path').val(root_path);
    });
};
Storage.prototype = {
    constructor: Storage,
    bindEvent: function(){
        var f = this;
        //上传文件
        $('#upload_box').on('change', '#file_input', function(){
            var file = this.files[0];
            if (file) {
                f.uploadTask(file)
            } else {
                console.log('----> no file.');
            }
        });
        //新建文件夹
        $('#new_floder').on('click', function(){
            $.post(
                '/disk.action',
                {
                    account: f.account,
                    token: f.token,
                    action: 'newFolder',
                    path: f.getFullPath(f)
                },
                function(data){
                    if (data.code == 100)
                        $('#file_list').prepend(f.printItem(f, data.result));
                },
                'json'
            );
        });
        //全选/选择
        $('#select_all').on('change', function(){
            if ($(this)[0].checked) {
                $('#file_list').find('input[type="checkbox"]').prop('checked', 'checked');
                $('#all_edit').show();
            } else {
                $('#file_list').find('input[type="checkbox"]').removeAttr('checked');
                $('#all_edit').hide();
            }
        });
        $('#file_list').on('change', 'input[type="checkbox"]', function(){
            if($('#file_list').find('input[type="checkbox"]:checked').length == 0) {
                $('#all_edit').hide();
            } else {
                $('#all_edit').show();
            }
        });
        //编辑菜单显示/隐藏
        $('#file_list').on('mouseover', '.file_item', function(){
            $(this).find('.file_item_edit').show();
        });
        $('#file_list').on('mouseout', '.file_item', function(){
            $(this).find('.file_item_edit').hide();
        });
        //目录跳转
        $('#file_menu').on('click', 'a', function(){
            var indexNum = $('#file_menu a').index(this);
            if (indexNum == 0) {
                if (f.menu_stack.length > 1) {
                    f.menu_stack.pop();
                    path = f.menu_stack.pop();
                    f.dir(path);
                }
            } else {
                f.menu_stack = f.menu_stack.slice(0, indexNum-1);
                f.dir($(this).text());
            }
        });
        //打开文件夹
        $('#file_list').on('click', '.open_menu', function(){
            var folder_name = $(this).attr('data-val');
            if (folder_name == 'thumb' && f.view == 1) {
                return;
            }
            f.dir(folder_name);
        });
        //重命名
        $('#file_list').on('click', '.file_rename', function(){
            var td = $(this).parents('tr').find('td:eq(1)');
            var file_name = $(this).parents('tr').find('td:eq(1)').text();
            var input = td.append('<input type="text" class="file_input" value="'+file_name+'">').find('input');
            input.focus();
            input.one('blur', function(){
                var new_name = $(this).val();
                if (new_name != '' && new_name != file_name) {
                    path = (f.menu_stack.join('/') + '/').substring(1);
                    $.post(
                        '/disk.action',
                        {
                            account: f.account,
                            token: f.token,
                            action: 'rename',
                            file_name: path + file_name,
                            new_name: path + new_name
                        },
                        function(data){
                            if (data.code == 100)
                                f.dir();
                            else
                                alert('重命名失败');
                        },
                        'json'
                    );
                }
                input.remove();
            });
        });
        //移动
        $('#file_list').on('click', '.file_move', function(){
            var tr = $(this).parents('tr');
            f.menu_selector.open(function(new_path){
                f.move(f, tr, new_path);
            });
        });
        //批量移动
        $('#all_edit').on('click', '.all_move', function(){
            f.menu_selector.open(function(new_path){
                $('#file_list').find('input[type="checkbox"]:checked').each(function(){
                    f.move(f, $(this).parents('tr'), new_path);
                });
            });
            $('#select_all').removeAttr('checked');
            $('#all_edit').hide();
        });
        //删除
        $('#file_list').on('click', '.file_delete', function(){
            if (confirm('确定要删除吗？操作不可恢复哦！')){
                f.delete(f, $(this).parents('tr'));
            }
        });
        //批量删除
        $('#all_edit').on('click', '.all_delete', function(){
            if (confirm('确定要批量删除这些文件吗？操作不可恢复！')) {
                $('#select_all').removeAttr('checked');
                $('#file_list').find('input[type="checkbox"]:checked').each(function(){
                    f.delete(f, $(this).parents('tr'));
                });
                $('#select_all').removeAttr('checked');
                $('#all_edit').hide();
            }
        });
        //排序
        $('#file_list_sort').on('click', '.set_sort', function(){
            f.sort = parseInt($(this).attr('data-val'));
            $('#file_list_sort').find('a span').removeClass('glyphicon-arrow-up').removeClass('glyphicon-arrow-down');
            switch (f.sort) {
                case 0:
                    $(this).attr('data-val', 1);
                    $(this).find('span').addClass('glyphicon-arrow-up');
                    break;
                case 1:
                    $(this).attr('data-val', 0);
                    $(this).find('span').addClass('glyphicon-arrow-down');
                    break;
                case 2:
                    $(this).attr('data-val', 3);
                    $(this).find('span').addClass('glyphicon-arrow-down');
                    break;
                case 3:
                    $(this).attr('data-val', 2);
                    $(this).find('span').addClass('glyphicon-arrow-up');
                    break;
                case 4:
                    $(this).attr('data-val', 5);
                    $(this).find('span').addClass('glyphicon-arrow-down');
                    break;
                case 5:
                    $(this).attr('data-val', 4);
                    $(this).find('span').addClass('glyphicon-arrow-up');
                    break;
            }
            f.dir();
        });
        //关键字搜索
        $('#file_keyword').on('blur', function(){
            if (f.keyword != $(this).val()) {
                f.keyword = $(this).val();
                f.dir();
            }
        });
        //设置网盘根路径
        $('#set_root_path').on('click', function(){
            $.post(
                '/config.action',
                {
                    account: getCookie('account'),
                    token: getCookie('token'),
                    action: 'setInfo',
                    field: 'root_path',
                    value: $('#root_path').val()
                },
                function(data) {
                    if (data.code == 100) {
                        alert('网盘路径设置成功', 'success');
                        f.dir();
                    } else {
                        alert(data.error);
                    }
                },
                'json'
            );
        });
    },
    rootPath: function(callback){
        $.post(
            '/config.action',
            {
                account: getCookie('account'),
                token: getCookie('token'),
                action: 'info'
            },
            function(data) {
                if (data.code == 100) {
                    callback(data.result.root_path);
                }
            },
            'json'
        );
    },
    getFullPath: function(f){
        return (f.menu_stack.join('/') + '/').substring(1);
    },
    uploadTask: function(file){
        var f = this;
        var html = '<tr><td style="font-size:12px;color:#666;">'+file.name+'</td>'
            + '<td style="width:160px;"><div class="progress" style="margin:0px;">'
            + '<div class="progress-bar progress-bar-info" style="width:1%;">1%</div></div></td></tr>';
        var item = $('#upload_task').prepend(html).find('tr:eq(0)');
        var progress = item.find('td:eq(1) .progress-bar');
        //建立连接
        var socket = io.connect(f.socket_link);
        //请求上传文件
        socket.send(JSON.stringify({
            "code": 100,
            "name": file.name,
            "size": file.size,
            "path": f.getFullPath(f)
        }));
        socket.on('message', function(msg){
            if (msg == 'ok') {
                //开始上传
                var buffer_size = 2097152,
                    start = 0,
                    end = buffer_size;
                //创建缓冲区
                var reader = new FileReader();
                reader.onload = function(e) {
                    socket.send(reader.result);
                    //循环加载
                    if (end < file.size) {
                        start += buffer_size;
                        end += buffer_size;
                        if (end > file.size)
                            end = file.size;
                        //分片读入
                        reader.readAsArrayBuffer(file.slice(start, end));
                    } else {
                        item.hide(3000);
                        setTimeout(function(){
                            f.dir();
                            item.parent().remove();
                            socket.close();
                        }, 3000);
                    }
                };
                reader.onprogress = function(e){
                    var width = parseInt((end / file.size) * 100);
                    if (width > 100)
                        width = 100;
                    if (width > 60 && width < 90) {
                        progress.removeClass('progress-bar-info').addClass('progress-bar-warning');
                    } else if (width >= 90) {
                        progress.removeClass('progress-bar-warning').addClass('progress-bar-success');
                    }
                    progress.attr('style', 'width:'+width+'%').text(width+'%');
                }
                reader.readAsArrayBuffer(file.slice(start, end));
            }
        });
    },
    move: function(f, tr, new_path){
        var file_name = tr.find('td:eq(1)').text();
        $.post(
            '/disk.action',
            {
                account: f.account,
                token: f.token,
                action: 'move',
                path: f.getFullPath(f),
                file_name: file_name,
                new_path: new_path
            },
            function(data){
                if (data.code == 100){
                    tr.remove();
                } else {
                    alert(data.error);
                }
            },
            'json'
        );
    },
    delete: function(f, tr){
        var file_name = tr.find('td:eq(1)').text();
        $.post(
            '/disk.action',
            {
                account: f.account,
                token: f.token,
                action: 'remove',
                path: f.getFullPath(f) + file_name
            },
            function(data){
                if (data.code == 100){
                    tr.remove();
                } else {
                    alert(data.error);
                }
            },
            'json'
        );
    },
    dir: function(path) {
        var f = this;
        var url = f.menu_stack.join('/');
        if (path != undefined) {
            if (f.menu_stack.length == 0 && path == '全部文件')
                path = '';
            url += '/' + path;
        }
        $.post(
            '/disk.action',
            {
                account: f.account, token: f.token,
                action: 'dir',
                path: url,
                sort: f.sort, keyword: f.keyword
            },
            function(data){
                if (data.code == 100) {
                    if (path != undefined)
                        f.menu_stack.push(path);
                    f.printMenu(f);
                    var html = '';
                    $.each(data.result, function(i, d){
                        html += f.printItem(f, d);
                    });
                    $('#file_list').html(html);
                    $('#str_count').html('<span class="label label-default">已加载文件数量共 <strong>'+data.result.length+'</strong> 个</span>');
                } else {
                    alert(data.error);
                }
            },
            'json'
        );
    },
    printItem: function(f, d){
        var html = '<tr class="file_item"><td>';
        var icon = FileMenu.prototype.printIcon(d.type, d.name)
        if (d.type != 'folder')
            html += '<input type="checkbox">';
        html += '</td><td style="position:relative;">'
        if (icon == 'ic_image.png')
            html += '<img src="/reader.action/'+f.getFullPath(f)+d.name+'" style="width:50px;margin-right:10px;">';
        else
            html += '<img src="images/' + icon + '" style="width:50px;margin-right:10px;">';
        if (d.type != 'folder') {
            if (d.type.substring(0, 5) == 'image') {
                html += '<a href="/album.page/' + f.getFullPath(f) + d.name + '" target="_blank">' + d.name + '</a></td><td>'
            } else {
                html += '<a href="/reader.action/' + f.getFullPath(f) + d.name + '" target="_blank">' + d.name + '</a></td><td>'
            }
            html += '<a href="/download.action/' + f.getFullPath(f) + d.name + '" target="_blank" title="下载" class="file_item_edit"><span class="glyphicon glyphicon-download"></span></a> '
                + '<a href="javascript:;" title="移动" class="file_item_edit file_move"><span class="glyphicon glyphicon-arrow-right"></span></a> ';
        } else {
            html += '<a href="javascript:;" class="open_menu" data-val="'+d.name+'">' + d.name + '</a></td><td>';
        }
        html += '<a href="javascript:;" title="重命名" class="file_item_edit file_rename"><span class="glyphicon glyphicon-repeat"></span></a> '
            + '<a href="javascript:;" title="删除" class="file_item_edit file_delete"><span class="glyphicon glyphicon-trash"></span></a></td>'
            + '<td><small>' + d.size + '</small></td>'
            + '<td><small>' + d.mtime + '</small></td></tr>';
        return html;
    },
    printMenu: function(f){
        var html = '';
        var c = f.menu_stack.length;
        var first = true;
        while (c) {
            if (! first) {
                if (c > 1)
                    html = '<a href="javascript:;" class="label label-info">' + f.menu_stack[c-1] + '</a> ' + html;
                else
                    html = '<a href="javascript:;" class="label label-info">全部文件</a> ' + html;
            } else {
                if (c > 1)
                    html = '<span class="label label-default">' + f.menu_stack[c-1] + '</span>';
                else
                    html = '<span class="label label-default">全部文件</span>';
            }
            first = false;
            --c;
        }
        $('#file_menu').html('<a href="javascript:;" class="label label-warning"><span class="glyphicon glyphicon-chevron-left"></span> 返回上一级</a> ' + html);
    }
};
/**
 * 文件选择器
 * @param {*} account 
 * @param {*} token 
 * @param {*} is_dir 
 */
var FileMenu = function(is_dir){
    this.account = getCookie('account');
    this.token = getCookie('token');
    this.is_dir = is_dir;
    this.listener = undefined;
    this.menu_stack = [];
    this.select_menu = '';
    this.insertUI();
    this.bindEvent();
};
FileMenu.prototype = {
    constructor: FileMenu,
    insertUI: function(){
        $('body').append('<div id="folder_menu" class="modal fade" tabindex="-1" role="dialog">'
            + '<div class="modal-dialog" role="document"><div class="modal-content"><div class="modal-header">'
            + '<button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>'
            + '<h4 class="modal-title">选择文件夹</h4></div><div class="modal-body"><table class="table table-bordered" id="folder_menu_list"></table>'
            + '</div><div class="modal-footer">'
            + '<button type="button" class="btn btn-info pull-left" id="folder_menu_back"><span class="glyphicon glyphicon-chevron-left"></span> 返回上一级</button>'
            + '<button type="button" class="btn btn-warning" id="folder_menu_cancel"><span class="glyphicon glyphicon-remove"></span> 取消</button>'
            + '<button type="button" class="btn btn-success" id="folder_menu_ok"><span class="glyphicon glyphicon-ok"></span> 确定</button>'
            + '</div></div></div></div>');
    },
    bindEvent: function(){
        var f = this;
        //返回上一级目录
        $('#folder_menu').on('click', '#folder_menu_back', function(){
            if (f.menu_stack.length > 1) {
                f.menu_stack.pop();
                f.getMenu(f);
                f.select_menu = '';
            }
        });
        //进入下一级目录
        $('#folder_menu').on('dblclick', '#folder_menu_list td', function(){
            f.menu_stack.push($(this).text());
            f.select_menu = '';
            f.getMenu(f);
        });
        //选中目录
        $('#folder_menu').on('click', '#folder_menu_list td', function(){
            $('#folder_menu').find('td').removeClass('active');
            $(this).addClass('active');
            f.select_menu = $(this).text();
        });
        //确定按钮
        $('#folder_menu').on('click', '#folder_menu_ok', function(){
            if (f.listener != undefined) {
                var path = f.menu_stack.join('/');
                if (f.select_menu != '')
                    path += '/' + f.select_menu;
                path += '/';
                f.listener(path.substring(1));
                $('#folder_menu').modal('hide');
            } else {
                alert('未定义操作');
            }
        });
        //取消按钮
        $('#folder_menu').on('click', '#folder_menu_cancel', function(){
            f.listener = undefined;
            f.menu_stack = [];
            f.select_menu = '';
            $('#folder_menu').modal('hide');
        });
    },
    open: function(listener, path){
        this.listener = listener;
        if (path == undefined)
            path = '';
        this.menu_stack = [];
        this.select_menu = '';
        this.menu_stack.push(path);
        this.getMenu(this);
        $('#folder_menu').modal('show');
    },
    getMenu: function(f) {
        type = ''
        if (f.is_dir)
            type = 'folder';
        $.post(
            '/disk.action',
            {
                account: f.account,
                token: f.token,
                action: 'dir',
                path: f.menu_stack.join('/'),
                type: type,
                sort: 0,
                keyword: ''
            },
            function (data) {
                if (data.code == 100) {
                    var html = '';
                    $.each(data.result, function(i,d){
                        html += '<tr><td><img src="images/'
                            + f.printIcon(d.type, d.name)
                            + '" style="width:30px;margin-right:10px;">' + d.name + '</td></tr>';
                    });
                    $('#folder_menu_list').html(html);
                } else {
                    alert(data.error);
                }
            },
            'json'
        );
    },
    printIcon: function(type, name){
        if (type != 'folder') {
            switch (name.substring(name.length-3, name.length).toLowerCase()) {
                case 'jpg':
                case 'peg':
                case 'png':
                case 'gif':
                    return 'ic_image.png';
                case 'zip':
                case 'rar':
                    return 'ic_zip.png';
                case 'pdf':
                    return 'ic_pdf.png';
                case 'wav':
                case 'mp3':
                    return 'ic_music.png';
                case 'ocx':
                case 'doc':
                    return 'ic_word.png';
                case 'xls':
                case 'lsx':
                    return 'ic_xls.png';
                case 'ppt':
                case 'ptx':
                    return 'ic_ppt.png';
                case 'mp4':
                    return 'ic_movie.png';
                case 'txt':
                    return 'ic_txt.png';
                case 'tml':
                case '.js':
                case 'php':
                case 'ava':
                case '.py':
                case 'xml':
                case 'son':
                case 'sql':
                    return 'ic_code.png';
                case 'psd':
                    return 'ic_psd.png';
                case '.ai':
                    return 'ic_ai.png';
                default:
                    return 'ic_file.png';
            }
        } else {
            return 'ic_folder.png';
        }
    }
};
/**
 * 分页工具
 * @param {*} handle 
 * @param {*} limit 
 * @param {*} size 
 * @param {*} listener 
 */
var Pagination = function(handle, limit, size, listener){
    this.handle = handle;
    this.limit = limit;
    this.size = size;
    this.listener = listener;
    this.pages = 0; //总页数
    this.cursor = 1; //当前页

    var f = this;
    this.handle.on('click', 'a', function(){
        f.cursor = parseInt($(this).text());
        f.listener((f.cursor - 1) * f.limit);
    });
};
Pagination.prototype = {
    constructor: Pagination,
    show: function(all_count){
        this.pages = Math.ceil(all_count / this.limit);
        if (this.pages > 1) {
            this.handle.html(this.render());
        } 
    },
    render: function(){
        var html = '<ul class="pagination pagination-sm" style="margin:0px;">';
		//第一页
		if(this.cursor == 1) {
			html += '<li class="active"><a href="javascript:;">1</a></li>';
			var i = 2;
			var e = this.pages <= this.size ? this.pages : this.size;
			for(; i<=e; ++i) {
				html += '<li><a href="javascript:;">'+i+'</a></li>';
			}
		}
		//最后一页
		else if(this.cursor == this.pages) {
			var i = this.pages > this.size ? (this.pages - this.size) : 1;
			for(; i<this.pages; ++i) {
				html += '<li><a href="javascript:;">'+i+'</a></li>';
			}
			html += '<li class="active"><a href="javascript:;">'+this.pages+'</a></li>';
		}
		//中间页
		else {
            var half = this.size / 2;
			var i = this.cursor > half ? (this.cursor - half) : 1;
			for(; i<this.cursor; ++i) {
				html += '<li><a href="javascript:;">'+i+'</a></li>';
			}
			html += '<li class="active"><a href="javascript:;">'+this.cursor+'</a></li>';
			var e = (this.cursor + half) > this.pages ? this.pages : (this.cursor + half);
			var j = this.cursor + 1;
			for(; j<=e; ++j) {
				html += '<li><a href="javascript:;">'+j+'</a></li>';
			}
		}
		return html + '</ul>';
    }
};