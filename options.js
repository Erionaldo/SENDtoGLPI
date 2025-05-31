// options.js
document.addEventListener('DOMContentLoaded', restoreOptions);
document.getElementById('save').addEventListener('click', saveOptions);

function saveOptions() {
    const glpiUrl = document.getElementById('glpiUrl').value;
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const appToken = document.getElementById('appToken').value;

    chrome.storage.sync.set({
        glpiUrl: glpiUrl.trim(),
        username: username.trim(),
        password: password, // Senha não recebe trim para não remover espaços intencionais
        appToken: appToken.trim()
    }, function() {
        const status = document.getElementById('status');
        status.textContent = 'Opções salvas com sucesso!';
        setTimeout(function() {
            status.textContent = '';
        }, 2000);
    });
}

function restoreOptions() {
    // Define valores padrão se ainda não estiverem configurados
    chrome.storage.sync.get({
        glpiUrl: 'https://chamados.pztech.net.br/apirest.php', // Seu URL padrão
        username: '',
        password: '',
        appToken: 'mavUJOR3odT34JuWrZqZM2VkZVwuTMwr8EGNdzgw'  // Seu App Token padrão
    }, function(items) {
        document.getElementById('glpiUrl').value = items.glpiUrl;
        document.getElementById('username').value = items.username;
        document.getElementById('password').value = items.password;
        document.getElementById('appToken').value = items.appToken;
    });
}