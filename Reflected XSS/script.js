const currentRoute = location.pathname === '/fixed' ? '/fixed' : '/vulnerable';
document.querySelectorAll('nav a').forEach(link => {
  if (link.dataset.route === currentRoute) link.setAttribute('aria-current', 'page');
});