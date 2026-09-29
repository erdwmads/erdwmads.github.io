(()=>{
const button=document.querySelector('[data-print-cv]');
if(button){button.hidden=false;button.addEventListener('click',()=>window.print());}
// Printed CVs show the usable address; the page keeps only the "[at] [dot]" form and decodes it just for printing.
// Soft navigation re-runs this script, so the print listeners are bound once and look up the current CV each time.
if(window.cvPrintEmailBound)return;
window.cvPrintEmailBound=true;
addEventListener('beforeprint',()=>{
  const email=document.querySelector('[data-email-print]');if(!email)return;
  // Browsers can fire beforeprint twice before one afterprint; keep the first, obfuscated text.
  if(!('shown' in email.dataset))email.dataset.shown=email.textContent;
  email.textContent=email.dataset.shown.trim().replace(/\s*\[\s*at\s*\]\s*/gi,'@').replace(/\s*\[\s*dot\s*\]\s*/gi,'.');
});
addEventListener('afterprint',()=>{
  const email=document.querySelector('[data-email-print][data-shown]');if(!email)return;
  email.textContent=email.dataset.shown;delete email.dataset.shown;
});
})();
