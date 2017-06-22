var initNav = function(nav, callback){
    $('.navbar-nav li').removeClass('active');
    $('.navbar-nav li:eq('+nav+')').addClass('active');
    $('#nav_account').text(getCookie('account'));
};
/**
 * 获取cookie
 * @param {*} key 
 */
var getCookie = function(key) {
    var start = document.cookie.indexOf(key);
    if (start != -1) {
        start += key.length + 1;
        var end = document.cookie.indexOf(';', start);
        if (end == -1) {
            end = document.cookie.length;
        }
        return document.cookie.substring(start, end);
    } else {
        return '';
    }
};
/**
 * 友好的警告框
 * @param {*} message 
 * @param {*} style 
 */
var alert = function(message, style){
    if (style == undefined)
        style = 'danger';
    var toast = $('#toast_box');
    message += ' <span class="glyphicon glyphicon-remove"></span>';
    if (toast.html() != undefined) {
        toast.attr('class', 'alert alert-'+style).html(message);
    } else {
        $('body').append('<div id="toast_box" class="alert alert-'+ style +'">'+message+'</div>');
        toast = $('#toast_box');
        toast.attr('style', "position:fixed;");
    }
    var left = ($(document).width() - toast.width()) / 2;
    toast.attr('style', "position:fixed;top:80px;left:"+left+'px');
    toast.fadeOut(5000);
};
/**
 * 格式化时间
 * @param {*} format    y-m-d h:i:s
 * @param {*} time      毫秒时间戳
 * @param {*} timezone  时区 
 */
var dateFormat = function(format, time){
    var date;
    if (time != undefined)
        date = new Date(time);
    else
        date = new Date();
    var date_dict = {
        'y': date.getFullYear(),
        'm': date.getMonth() + 1,
        'd': date.getDate(),
        'h': date.getHours(),
        'i': date.getMinutes(),
        's': date.getSeconds()
    }
    if (format == undefined)
        format = 'y-m-d h:i:s';
    var date_str = '';
    for(var i=0; i<format.length; i++) {
        var s = format.charAt(i);
        if (date_dict[s]) {
            date_str += date_dict[s] < 10 ? '0'+date_dict[s] : date_dict[s];
        } else {
            date_str += s;
        }  
    }
    return date_str;
};