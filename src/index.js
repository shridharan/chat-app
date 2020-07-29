const path = require('path')
const http = require('http')
const express = require('express')
const socketio  = require('socket.io')
var Filter = require('bad-words')
const {generateMessage, generateLocationMessage} = require('./utils/message')
const {addUser,removeUser,getUser,getUsersInRoom} = require('./utils/user')

const publicDir = path.join(__dirname,'../public')

const app = express()
const server = http.createServer(app)
const io = socketio(server)
app.use(express.static(publicDir))

io.on('connection', (socket) => {
    console.log('New web socket connection!')
    socket.on('join', ({username, room},callback)=>{
        const {error,user} = addUser({
            id:socket.id,
            username,
            room
        })
        if (error) {
            return callback(error)
        }

        socket.join(user.room)
        socket.emit('systemMessage', generateMessage(`Welcome to ${user.room}!`,user.username))
        //Send an update to everyone (but you) that you joined
        socket.broadcast.to(user.room).emit('systemMessage', generateMessage(`${user.username} has joined!`, user.username))

        io.to(user.room).emit('onlineUsers',{
            room:user.room, 
            users:getUsersInRoom(user.room)
        })

        callback()
    })

    socket.on('sendMessage',(text,callback)=>{
        const filter = new Filter()
        if (filter.isProfane(text)) {
            return callback('Profanity is not allowed!')
        }
        const user = getUser(socket.id)
        io.to(user.room).emit('message', generateMessage(text,user.username))
        callback('Delivered!')
    })
    socket.on('shareLocation', (lat, long, callback) => {
        const user = getUser(socket.id)
        io.to(user.room).emit('broadcastLocation', generateLocationMessage(`https://google.com/maps?q=${lat},${long}`, user.username))
        callback()
    })
    socket.on('disconnect', ()=> {
        const user = removeUser(socket.id)
        if(user) {
            io.to(user.room).emit('systemMessage',generateMessage(`${user.username} has left!`, user.username))
            io.to(user.room).emit('onlineUsers',{
                room:user.room, 
                users:getUsersInRoom(user.room)
            })
        }
    })
})

const port = process.env.PORT || 3000
server.listen(port, () => {
    console.log('Chat server listening on port',port)
}) 