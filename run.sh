echo '启动主服务进程...'
nohup node web.js > logs/web.log &
echo '启动文件上传服务...'
nohup node upload.js > logs/upload.log &
echo '启动完成.'

sleep 2s
#mac
open 'http://127.0.0.1:2008'
#linux
#x-www-browser 'http://127.0.0.1:2008'