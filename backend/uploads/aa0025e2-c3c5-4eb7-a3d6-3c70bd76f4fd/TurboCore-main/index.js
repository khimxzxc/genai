// Открыть модальное окно
document.getElementById("play").addEventListener("click", function() {
    document.getElementById("my-modal").classList.add("open")
})

document.getElementById("playtwo").addEventListener("click", function() {
    document.getElementById("my-modal").classList.add("open")
})

document.getElementById("playthree").addEventListener("click", function() {
    document.getElementById("my-modal").classList.add("open")
})



// Закрыть модальное окно
document.getElementById("close-my-modal-btn").addEventListener("click", function() {
    document.getElementById("my-modal").classList.remove("open")
})


window.addEventListener('keydown', (e) => {
    if (e.key === "Escape") {
        document.getElementById("my-modal").classList.remove("open")
    }
});

// Закрыть модальное окно при клике вне его
/*/  document.querySelector("#my-modal .modal__box").addEventListener('click', event => {
    event._isClickWithInModal = true;
});
document.getElementById("my-modal").addEventListener('click', event => {
    if (event._isClickWithInModal) return;
    event.currentTarget.classList.remove('open');
});

/*/

document.querySelectorAll('a.scroll[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      e.preventDefault();
  
      const target = document.querySelector(this.getAttribute('href'));
  
      if (target) {
        const targetTop = target.getBoundingClientRect().top + window.pageYOffset;
        window.scrollTo({
          top: targetTop,
          behavior: 'smooth'
        });
      }
    });
  });
  


  document.getElementById("registration").addEventListener("click", function() {
    document.getElementById("reg-modal").classList.add("ok")
})


window.addEventListener('keydown', (e) => {
    if (e.key === "Escape") {
        document.getElementById("reg-modal").classList.remove("ok")
    }
});


document.getElementById("close-reg").addEventListener("click", function() {
    document.getElementById("reg-modal").classList.remove("ok")
})

document.getElementById("reg-btn").addEventListener("click", function() {
    document.getElementById("vhod-modal").classList.add("no")
})

document.getElementById("reg-btn").addEventListener("click", function() {
    document.getElementById("reg-modal").classList.remove("ok")
})


document.getElementById("registrationtwo").addEventListener("click", function() {
    document.getElementById("reg-modal").classList.add("ok")
})


document.getElementById("registrationthree").addEventListener("click", function() {
    document.getElementById("reg-modal").classList.add("ok")
})

document.getElementById("vhod").addEventListener("click", function() {
    document.getElementById("vhod-modal").classList.add("no")
})


window.addEventListener('keydown', (e) => {
    if (e.key === "Escape") {
        document.getElementById("vhod-modal").classList.remove("no")
    }
});


document.getElementById("close-vhod").addEventListener("click", function() {
    document.getElementById("vhod-modal").classList.remove("no")
})



document.getElementById("neregbtn").addEventListener("click", function() {
    document.getElementById("vhod-modal").classList.add("no")
})

document.getElementById("neregbtn").addEventListener("click", function() {
    document.getElementById("reg-modal").classList.remove("ok")
})


document.getElementById("goreg").addEventListener("click", function() {
    document.getElementById("reg-modal").classList.add("ok")
})

document.getElementById("goreg").addEventListener("click", function() {
    document.getElementById("vhod-modal").classList.remove("no")
})


document.getElementById("vhod-btn").addEventListener("click", function() {
    document.getElementById("vhod-modal").classList.remove("no")
})
