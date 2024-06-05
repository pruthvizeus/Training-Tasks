function formSubmit() {
    var name = document.getElementById('name')
    var comment = document.getElementById('comments')
    var male = document.getElementById('Male')
    var female = document.getElementById('Female')
    //    alert(gender.checked)
    if (name.value.length == 0) {
        alert("Write name")
        document.getElementById('name').focus()
    }
    else if (comment.value.length == 0) {
        alert("Write comment")
    }
   else if (male.checked == false && female.checked == false) {
        alert("select  gender")
    }
    if(name.value.length && comment.value.length && (male.checked || female.checked))
    {
        
        alert(`Yoo ${name.value} , your form got submmitted `)
    }
    //added commment
}