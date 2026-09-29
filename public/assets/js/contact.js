(()=>{
const address=document.querySelector('[data-email-address]');if(!address)return;
// The static HTML only carries the "name [at] domain [dot] tld" form; the usable address exists only after this runs.
const email=address.textContent.trim().replace(/\s*\[\s*at\s*\]\s*/gi,'@').replace(/\s*\[\s*dot\s*\]\s*/gi,'.');
if(!/^[^\s@[\]]+@[^\s@[\]]+\.[^\s@[\]]+$/.test(email))return;
const status=document.querySelector('[data-email-status]');
document.querySelector('[data-email-compose]').href='mailto:'+email;
const actions=document.querySelector('[data-email-actions]');if(actions)actions.hidden=false;
document.querySelector('[data-email-copy]').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(email);status.textContent='Email address copied.';}catch{address.textContent=email;const range=document.createRange();range.selectNodeContents(address);const selection=getSelection();selection.removeAllRanges();selection.addRange(range);status.textContent='Address selected. Copy it with your browser or keyboard.';}});
})();
