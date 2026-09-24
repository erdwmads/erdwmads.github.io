(()=>{
const button=document.querySelector('[data-print-cv]');
if(button){button.hidden=false;button.addEventListener('click',()=>window.print());}
// Printed CVs show the usable address; the static HTML keeps only the [at] form.
const email=document.querySelector('[data-email-print]');
if(email)email.textContent=email.textContent.replace('[at]','@');
})();
