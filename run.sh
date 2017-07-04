echo '启动主服务进程...'
nohup node web.js > logs/web.log &
echo '启动web文件上传服务...'
nohup node upload_web.js > logs/upload_web.log &
echo '启动net文件上传服务...'
nohup node upload_net.js > logs/upload_net.log &
echo '启动完成.'

#sleep 2s
#mac
#open 'http://127.0.0.1:2008'
#linux
#x-www-browser 'http://127.0.0.1:2008'