async function loadApp() {
    await import('./server.js');
  }
  loadApp().catch((error) => console.log(error))