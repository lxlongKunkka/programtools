<template>
  <div id="app">
    <header class="header">
      <div class="branding">
        <img src="https://qimai-1312947209.cos.ap-shanghai.myqcloud.com/images/202403271535417.png" alt="Logo" class="app-logo" />
        <h1>Acjudge Tools</h1>
      </div>
      <nav>
        <router-link to="/">Home</router-link>
        <router-link to="/translate">Translate</router-link>
        <router-link to="/checker">Checker</router-link>
        <router-link to="/solution">Solution</router-link>
        <router-link to="/solvedata">Solve+Data</router-link>
        <router-link to="/chat">Chat</router-link>
      </nav>
    </header>
    <main>
      <router-view />
    </main>
  </div>
</template>

<style>
body { font-family: Arial, Helvetica, sans-serif; margin: 0; }
.header { background: #2b9af3; color: white; padding: 12px 18px; display:flex; align-items:center; justify-content:space-between }
.branding { display: flex; align-items: center; gap: 12px; }
.app-logo { height: 32px; width: auto; border-radius: 6px; background: white; padding: 2px; }
.header h1 { margin: 0; font-size: 20px; }
.header nav a { color: white; margin-left:12px; text-decoration:none }
main { padding: 18px }
</style>
