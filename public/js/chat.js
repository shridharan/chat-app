const socket = io()

const $messageForm = document.querySelector('#message-form')
const $messageFormInput = $messageForm.querySelector('input')
const $messageFormButton = $messageForm.querySelector('button')
const $locationButton =  document.querySelector('#location')
const $messages  = document.querySelector('#messages')

const $messagesTemplate = document.querySelector('#messages-template').innerHTML
const $systemMessagesTemplate = document.querySelector('#system-messages-template').innerHTML
const $locationTemplate = document.querySelector('#location-template').innerHTML
const $sidebarTemplate = document.querySelector('#sidebar-template').innerHTML

const timeFormat = 'h:mm A'

const {username, room} = Qs.parse(location.search,{ignoreQueryPrefix:true})

const autoscroll = () => {
    $newMessageElem = $messages.lastElementChild
    newMessageMargin = parseInt(window.getComputedStyle($newMessageElem).marginBottom)
    if ($messages.scrollHeight - ($newMessageElem.offsetHeight + newMessageMargin) <= Math.ceil($messages.scrollTop + $messages.offsetHeight)) {
        $messages.scrollTop = $messages.scrollHeight
    }
}

socket.emit('join', {username, room},(error)=>{
    if(error) {
        alert(error)
        location.href = '/'
    }
})

socket.on('systemMessage', (msg)=> {
    const rendered = Mustache.render($systemMessagesTemplate,{
        message:msg.text, 
        createdAt:moment(msg.createdAt).format(timeFormat)
    })
    $messages.insertAdjacentHTML('beforeend',rendered)
})

socket.on('message', (msg)=> {
    const rendered = Mustache.render($messagesTemplate, {
        message:msg.text, 
        username:msg.username,
        createdAt:moment(msg.createdAt).format(timeFormat)
    })
    $messages.insertAdjacentHTML('beforeend',rendered)
    autoscroll()
})

socket.on('onlineUsers', ({room, users})=> {
    document.querySelector('#chat-sidebar').innerHTML = Mustache.render($sidebarTemplate,{
        room:room,
        users:users
    })
})

socket.on('broadcastLocation', (location)=>{
    const rendered = Mustache.render($locationTemplate, {
        url:location.url, 
        username:msg.username,
        createdAt:moment(location.createdAt).format(timeFormat)
    })
    $messages.insertAdjacentHTML('beforeend',rendered)
    autoscroll()
})

$messageForm.addEventListener('submit',(event)=>{
    //to prevent full page reload 
    event.preventDefault()
    //disable sending while we are sending the message
    $messageFormButton.setAttribute('disabled','disabled')

    //const message = document.querySelector('[id="chat"]').value
    const message = event.target.elements.chat.value
    console.log('Form submitted with',message)
    socket.emit('sendMessage', message, (deliveryMsg)=> {
        $messageFormButton.removeAttribute('disabled')
        $messageFormInput.value = ''
        $messageFormInput.focus()

        console.log(deliveryMsg)
    })
})


$locationButton.addEventListener('click', () => {
    if(!navigator.geolocation) {
        return alert('Geolocation is not supported!')
    }
    $locationButton.setAttribute('disabled','disabled')
    navigator.geolocation.getCurrentPosition((location)=>{
        socket.emit('shareLocation', location.coords.latitude, location.coords.longitude, (error) => {
            $locationButton.removeAttribute('disabled')
            if (error) {
                return console.log('Location not shared!')
            }
            console.log('Location Shared!')
        })
    })

})