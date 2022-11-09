const deleteBtn = document.querySelectorAll('.del')
const markTaskComplete = document.querySelectorAll('.checkbox')
const updateBtn = document.querySelectorAll('#updateBtn')

Array.from(deleteBtn).forEach((el)=>{
    el.addEventListener('click', deleteTodo)
})

Array.from(markTaskComplete).forEach((el)=>{
        el.addEventListener('click', markComplete)
})
Array.from(updateBtn).forEach((element) => {
    element.addEventListener('click', updateTodos);
})

async function updateTodos() {
    const id = this.parentNode.dataset.id;
    const title = this.parentNode.childNodes[3].value;
    const body = this.parentNode.childNodes[7].value;
    const status = this.parentNode.childNodes[9].value;
    try{
        const response = await fetch(`/todos/${id}`, {
            method: 'put',
            headers: {'Content-type': 'application/json'},
            body: JSON.stringify({
                'idFromJSFile': id,
                'titleFromJSFile': title,
                'bodyFromJSFile': body,
                'statusFromJSFile': status
            })
        })
        const data = await response.json()
        console.log(data)
        location.replace('/')
    }catch(err){
        console.log(err)
    }
}

async function deleteTodo(){
    const todoId = this.parentNode.parentNode.dataset.id;
    try{
        const response = await fetch('/todos/deleteTodo', {
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
    let status = this.parentNode.parentNode.childNodes[5].classList[0];
    if (status === 'completed') {
        alert('Task is marked as complete.')
    } else {
        try {
            const response = await fetch('/todos/markComplete', {
                method: 'put',
            headers: {'Content-type': 'application/json'},
            body: JSON.stringify({
                'todoIdFromJSFile': todoId
            })
        })
        const data = await response.json()
        console.log(data)
        location.reload()
        } catch(error) {
        console.log(error)
        }
    }
}