(()=>{
const address=document.querySelector('[data-email-address]');if(!address)return;
const email=address.textContent.replace('[at]','@'),status=document.querySelector('[data-email-status]');
document.querySelector('[data-email-compose]').addEventListener('click',()=>{location.href='mailto:'+email;});
document.querySelector('[data-email-copy]').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(email);status.textContent='Email address copied.';}catch{address.textContent=email;const range=document.createRange();range.selectNodeContents(address);const selection=getSelection();selection.removeAllRanges();selection.addRange(range);status.textContent='Address selected. Copy it with your browser or keyboard.';}});
})();
