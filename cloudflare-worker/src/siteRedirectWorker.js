export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === '/simulation-studio' || url.pathname.startsWith('/simulation-studio/')) {
      return Response.redirect('https://app.metamechsolutions.com/simulation', 301);
    }
    return Response.redirect('https://app.metamechsolutions.com/simulation', 301);
  },
};

