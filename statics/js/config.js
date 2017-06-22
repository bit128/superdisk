var ConfigManager = function(){
    this.info();
    this.bindEvent();
};
ConfigManager.prototype = {
    constructor: ConfigManager,
    bindEvent: function(){
        var f = this;
        $('#root_path').on('blur', function(){
            f.setInfo('root_path', $(this).val());
        });
    },
    setInfo(field, value) {
        $.post(
            '/config.action',
            {
                account: getCookie('account'),
                token: getCookie('token'),
                action: 'setInfo',
                field: field,
                value: value
            },
            function(data) {
                if (data.code == 100) {
                    alert('操作成功', 'success');
                } else {
                    alert(data.error);
                }
            },
            'json'
        );
    },
    info: function(){
        $.post(
            '/config.action',
            {
                account: getCookie('account'),
                token: getCookie('token'),
                action: 'info'
            },
            function(data) {
                if (data.code == 100) {
                    $('#root_path').val(data.result.root_path);
                }
            },
            'json'
        );
    },
};
/**
 * 用户帐号管理
 */
var UserManager = function(){
    this.keyword = '';
    this.handle = $('#user_list');
    this.role_list = [1,2,4];
    this.role_label = ['配置','上传','删除'];
    this.getList();
    this.bindEvent();
};
UserManager.prototype = {
    constructor: UserManager,
    bindEvent: function(){
        var f = this;
        //关键字筛选
        $('#keyword').on('blur', function(){
            f.keyword = $(this).val();
            f.getList();
        });
        //保存用户数据
        $('#form_save').on('click', function(){
            var user_account = $('#user_account').val();
            if (! /^[a-z0-9A-Z\_]{4,32}$/.test(user_account)) {
                $('#user_account_error').show();
                return;
            } else {
                $('#user_account_error').hide();
            }
            var user_role = 0;
            $('#user_form input[name="user_role"]:checked').each(function(){
                user_role += parseInt($(this).val());
            });
            var user_exp = $('#user_exp').val();
            if (! /^\d{4}\-\d{2}\-\d{2}$/.test(user_exp)) {
                $('#user_exp_error').show();
                $('#user_exp').focus();
                return;
            } else {
                $('#user_exp_error').hide();
            }
            //提交表单数据
            $.post(
                '/user.action',
                {
                    account: getCookie('account'),
                    token: getCookie('token'),
                    action: 'update',
                    user_account: user_account,
                    user_role: user_role,
                    user_exp: user_exp,
                    user_password: $('#user_password').val(),
                },
                function(data){
                    if (data.code == 100) {
                        location.reload();
                    } else {
                        $('#user_info').modal('hide');
                        alert(data.error);
                    }
                },
                'json'
            );
        });
        //新建用户信息
        $('#new_user').on('click', function(){
            $('#user_form')[0].reset();
            $('input[name="user_role"]').each(function(){
                $(this).removeAttr('checked');
            });
            $('#user_info').modal('show');
        });
        //编辑用户数据
        this.handle.on('click', '.user_edit', function(){
            var user_account = $(this).parents('tr').find('td:eq(0)').text();
            $.post(
                '/user.action',
                {
                    account: getCookie('account'),
                    token: getCookie('token'),
                    action: 'get',
                    user_account: user_account
                },
                function(data) {
                    if (data.code == 100) {
                        $('#user_form')[0].reset();
                        $('#user_info').modal('show');
                        $('#user_account').val(data.result.account);
                        $('input[name="user_role"]').each(function(){
                            if (data.result.role & parseInt($(this).val())) {
                                $(this).attr('checked', 'checled');
                            }
                        });
                        $('#user_exp').val(data.result.exp.substring(0,10));
                    } else {
                        alert(data.error);
                    }
                },
                'json'
            );
        });
        //设置帐号状态
        this.handle.on('click', '.set_status', function(){
            var user_account = $(this).parents('tr').find('td:eq(0)').text();
            var user_status = $(this).attr('data-val');
            $.post(
                '/user.action',
                {
                    account: getCookie('account'),
                    token: getCookie('token'),
                    action: 'set_status',
                    user_account: user_account,
                    user_status: user_status
                },
                function(data){
                    if (data.code == 100)
                        location.reload();
                    else
                        alert(data.error);
                },
                'json'
            );
        });
        //删除帐号
        this.handle.on('click', '.user_delete', function(){
            if (confirm('确定要删除该帐号吗？操作不可恢复')) {
                var user_account = $(this).parents('tr').find('td:eq(0)').text();
                $.post(
                    '/user.action',
                    {
                        account: getCookie('account'),
                        token: getCookie('token'),
                        action: 'delete',
                        user_account: user_account
                    },
                    function(data){
                        if (data.code == 100)
                            location.reload();
                        else
                            alert(data.error);
                    },
                    'json'
                );
            }
        });
    },
    getList: function(){
        var f = this;
        $.post(
            '/user.action',
            {
                account: getCookie('account'),
                token: getCookie('token'),
                action: 'getList'
            },
            function(data) {
                if (data.code == 100) {
                    var html = '';
                    for (item in data.result) {
                        var d = data.result[item];
                        if (f.keyword != '' && d.account.indexOf(f.keyword) == -1)
                            continue;
                        html += '<tr><td>'+d.account+'</td>'
                            + '<td>'+f.printRole(f, d.role)+'</td>'
                            + '<td>'+dateFormat('m-d h:i', d.ltime)+'</td>'
                            + '<td>'+dateFormat('y-m-d', d.exp)+'</td><td>';
                        html += '<button type="button" class="btn btn-xs btn-default user_edit" title="编辑"><span class="glyphicon glyphicon-edit"></span></button> ';
                        if (d.stat)
                            html += '<button type="button" class="btn btn-xs btn-warning set_status" data-val="0" title="冻结"><span class="glyphicon glyphicon-remove-circle"></span></button>';
                        else
                            html += '<button type="button" class="btn btn-xs btn-success set_status" data-val="1" title="启用"><span class="glyphicon glyphicon-ok-circle"></span></button>';
                        html += ' <button type="button" class="btn btn-xs btn-default user_delete" title="删除"><span class="glyphicon glyphicon-trash"></span></button></td></tr>';
                    }
                    f.handle.html(html);
                } else {
                    alert(data.error);
                }
            },
            'json'
        )
    },
    printRole: function(f, role){
        var input = '';
        for (var i=0; i<f.role_label.length; i++) {
            if (role & f.role_list[i])
                input += '<label><input type="checkbox" value="'
                    +f.role_list[i]+'" checked> ' + f.role_label[i] + '</label> &nbsp;&nbsp;';
            else
                input += '<label><input type="checkbox" value="'
                    +f.role_list[i]+'"> ' + f.role_label[i] + '</label> &nbsp;&nbsp;';
        }
        return input;
    }
};