const deleteBtn = document.querySelectorAll('.del')
const todoComplete = document.querySelectorAll('.checkbox')
const todoItem = document.querySelectorAll('.checkbox')
const editBtn = document.querySelector('.edit').addEventListener('click', editTodos)

Array.from(deleteBtn).forEach((el)=>{
    el.addEventListener('click', deleteTodo)
})

Array.from(todoItem).forEach((el)=>{
    if (document.querySelector('.not')) {
        el.addEventListener('click', markComplete)
    }
})
Array.from(todoComplete).forEach((el)=>{
    if (document.querySelector('.completed')) {
        el.addEventListener('click', markIncomplete)
    }
})

async function editTodos() {
    alert("in development");
}

async function deleteTodo(){
    const todoId = this.parentNode.parentNode.dataset.id;
    try{
        const response = await fetch('todos/deleteTodo', {
            method: 'delete',
            headers: {'Content-type': 'application/json'},
            body: JSON.stringify({
                'todoIdFromJSFile': todoId
            })
        })
        const data = await response.json()
        console.log(data)
        location.reload()
    }catch(err){
        console.log(err)
    }
}

async function markComplete(){
    const todoId = this.parentNode.parentNode.parentNode.dataset.id;
    try{
        const response = await fetch('todos/markComplete', {
            method: 'put',
            headers: {'Content-type': 'application/json'},
            body: JSON.stringify({
                'todoIdFromJSFile': todoId
            })
        })
        const data = await response.json()
        console.log(data)
        location.reload()
    }catch(err){
        console.log(err)
    }
}

async function markIncomplete(){
    const todoId = this.parentNode.parentNode.parentNode.dataset.id;
    try{
        const response = await fetch('todos/markIncomplete', {
            method: 'put',
            headers: {'Content-type': 'application/json'},
            body: JSON.stringify({
                'todoIdFromJSFile': todoId
            })
        })
        const data = await response.json()
        console.log(data)
        location.reload()
    }catch(err){
        console.log(err)
    }
}