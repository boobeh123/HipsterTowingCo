let triggerBtn = document.querySelector('#scale-demo-trigger')
let offerCode = document.querySelector('#scale-demo')

if (!localStorage.getItem('dismissPromo')) {
    setTimeout(() => {
        offerCode.classList.remove('promo-d-none');
        offerCode.classList.remove('scale-out');
        offerCode.classList.add('scale-in');
    }, 3000)
}

triggerBtn.addEventListener('click', dismiss)

function dismiss() {
    localStorage.setItem('dismissPromo', `Dismissed on ${new Date()}`);
    offerCode.classList.remove('scale-in');
    offerCode.classList.add('scale-out');
    setTimeout(() => {
        offerCode.classList.add('promo-d-none');
    }, 300)
}