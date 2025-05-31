// content.js
(function() {
    'use strict';

    const CATEGORY_MAP = {
        'G-HOSP': {
            id: 2,
            subcategories: {
                'CG': 16, 'CP': 17, 'CT': 35, 'FN': 18, 'FT': 19, 'GD': 20, 'HH': 21,
                'MN': 22, 'MP': 23, 'NT': 24, 'PC': 25, 'PH': 26, 'PM': 27, 'PN': 28,
                'PR': 29, 'RC': 30, 'RD': 31, 'SCIH': 32, 'ST': 33, 'TS': 34
            }
        },
        'G-MUS': {
            id: 1,
            subcategories: {
                'ACS': 8, 'AE': 14, 'CG': 4, 'GD': 5, 'PM': 15, 'PR': 6, 'PRT': 13,
                'RG': 9, 'ST': 7, 'TR': 11, 'VC': 12, 'VP': 10
            }
        },
        'G-VIS': { id: 36 }
    };

    const LOCATION_MAP = {
        'G-MUS': {
            'XANGRILA': 6, 'TRAMANDAI': 8, 'TUPANDI': 17, 'CAPE': 26, 'LAGOA NOVA': 19,
            'BARRACAO': 4, 'CAMINHOS DO SOL': 12, 'GIRASSOL': 11
        },
        'G-VIS': { 'XANGRILA': 24, 'TRAMANDAI': 23 },
        'G-HOSP': {
            'BARRACAO': 3, 'MODULO COMPRAS': 10, 'FELIZ': 1, 'ITATIBA DO SUL': 9,
            'LAGOA NOVA': 20, 'NITEROI': 22, 'PARAI': 25, 'RIOZINHO': 21,
            'SALDANHA MARINHO': 2, 'TRAMANDAI': 7, 'XANGRILA': 5
        }
    };

    const standardizeString = (str) => {
        return str
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-zA-Z0-9]/g, '')
            .toUpperCase();
    };

    const getCategoryNameById = (categoryId, sector) => {
        if (!categoryId || !sector || !CATEGORY_MAP[sector]) return 'Desconhecida';
        const mainCategory = CATEGORY_MAP[sector];
        if (mainCategory.id === categoryId) return sector;
        if (mainCategory.subcategories) {
            for (const subName in mainCategory.subcategories) {
                if (mainCategory.subcategories[subName] === categoryId) {
                    return `${sector} ${subName}`;
                }
            }
        }
        return 'Desconhecida';
    };

    const getLocationNameById = (locationId, sector) => {
        if (!locationId || !sector || !LOCATION_MAP[sector]) return 'Desconhecida';
        const locationsForSector = LOCATION_MAP[sector];
        for (const locName in locationsForSector) {
            if (locationsForSector[locName] === locationId) {
                return locName;
            }
        }
        return 'Desconhecida';
    };

    async function sendToGLPI(chatContextElement) {
        const sendButtons = document.querySelectorAll('.send-to-glpi-button');
        sendButtons.forEach(button => {
            button.disabled = true;
            button.innerText = 'Coletando dados...';
            button.style.opacity = '0.6';
            button.style.cursor = 'not-allowed';
        });

        chrome.storage.sync.get({
            glpiUrl: 'https://chamados.pztech.net.br/apirest.php',
            username: '',
            password: '',
            appToken: 'mavUJOR3odT34JuWrZqZM2VkZVwuTMwr8EGNdzgw'
        }, async (items) => {
            const GLPI_URL = items.glpiUrl;
            const USERNAME = items.username;
            const PASSWORD = items.password;
            const APP_TOKEN = items.appToken;

            if (!USERNAME || !PASSWORD || !GLPI_URL || !APP_TOKEN) {
                alert('Por favor, configure a URL da API, App Token, Usuário e Senha do GLPI nas opções da extensão.');
                sendButtons.forEach(button => {
                    button.disabled = false;
                    button.innerText = 'Enviar para o GLPI';
                    button.style.opacity = '1';
                    button.style.cursor = 'pointer';
                });
                return;
            }

            const base64Auth = btoa(`${USERNAME}:${PASSWORD}`);
            const clienteElement = chatContextElement.querySelector('.contact-header-name');
            const cliente = clienteElement ? clienteElement.innerText.split(' - ')[0].trim() : 'Cliente Desconhecido';

            const setorElement = chatContextElement.querySelector('.badge-sector small');
            const setor = setorElement ? setorElement.innerText.trim() : '';

            const rawEtiquetaElements = chatContextElement.querySelectorAll('.ub-tag-group span');
            const etiquetasColetadas = [];
            rawEtiquetaElements.forEach(el => {
                let rawTag = el.innerText.trim();
                rawTag = rawTag.replace(/^[\u{1F000}-\u{1FFFF}|\u{2600}-\u{26FF}|\u{2700}-\u{27BF}]\s*/u, '').trim();
                if (rawTag && rawTag.length > 0) {
                    etiquetasColetadas.push(standardizeString(rawTag));
                }
            });

            let itilCategoryId = null;
            if (setor && CATEGORY_MAP[setor]) {
                const mainCategory = CATEGORY_MAP[setor];
                itilCategoryId = mainCategory.id;
                for (const tag of etiquetasColetadas) {
                    if (mainCategory.subcategories && mainCategory.subcategories[tag]) {
                        itilCategoryId = mainCategory.subcategories[tag];
                        break;
                    }
                }
            }

            let locationId = null;
            if (setor && LOCATION_MAP[setor]) {
                const locationsForSector = LOCATION_MAP[setor];
                for (const umblerTag of etiquetasColetadas) {
                    for (const mapLocationName in locationsForSector) {
                        if (mapLocationName.startsWith(umblerTag) || umblerTag.startsWith(mapLocationName)) {
                            locationId = locationsForSector[mapLocationName];
                            break;
                        }
                    }
                    if (locationId !== null) break;
                }
            }

            const titulo = `Atendimento com ${cliente}`;
            const categoriaExibicao = getCategoryNameById(itilCategoryId, setor);
            const localizacaoExibicao = getLocationNameById(locationId, setor);

            const confirmationMessage = `Tem certeza que deseja enviar esta conversa para o GLPI?\n\n` +
                                      `TÍTULO: ${titulo}\n` +
                                      `CATEGORIA: ${categoriaExibicao || 'Não Definida'}\n` +
                                      `LOCALIZAÇÃO: ${localizacaoExibicao || 'Não Definida'}\n\n` +
                                      `Clique em OK para confirmar ou Cancelar para abortar.`;

            const confirmSend = confirm(confirmationMessage);
            if (!confirmSend) {
                sendButtons.forEach(button => {
                    button.disabled = false;
                    button.innerText = 'Enviar para o GLPI';
                    button.style.opacity = '1';
                    button.style.cursor = 'pointer';
                });
                return;
            }

            sendButtons.forEach(button => {
                button.innerText = 'Enviando...';
            });

            let sessionToken;

            try {
                const loginRes = await fetch(`${GLPI_URL}/initSession`, {
                    method: 'GET',
                    headers: {
                        'App-Token': APP_TOKEN,
                        'Authorization': `Basic ${base64Auth}`
                    }
                });

                const loginData = await loginRes.json();
                if (!loginData?.session_token) {
                    alert('Erro ao autenticar no GLPI. Verifique as credenciais e configurações da API nas opções da extensão.');
                    sendButtons.forEach(button => {
                        button.disabled = false;
                        button.innerText = 'Enviar para o GLPI';
                        button.style.opacity = '1';
                        button.style.cursor = 'pointer';
                    });
                    return;
                }
                sessionToken = loginData.session_token;

                let atendente = 'Atendente Desconhecido';
                const atendenteSignatureElement = chatContextElement.querySelector('.signature-text.fw-bold');
                if (atendenteSignatureElement) {
                    atendente = atendenteSignatureElement.innerText.trim();
                }

                const formattedMessages = [];
                const allMessageElements = chatContextElement.querySelectorAll('.chat-message-member, .chat-message-contact');

                allMessageElements.forEach(el => {
                    const messageText = el.innerText.trim();
                    if (el.classList.contains('chat-message-member')) {
                        formattedMessages.push(messageText);
                    } else if (el.classList.contains('chat-message-contact')) {
                        formattedMessages.push(`${cliente}: ${messageText}`);
                    }
                });

                const mensagens = formattedMessages.join('\n');
                const now = new Date();
                const dataHora = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
                const chatLink = window.location.href;
                const conteudo = `LINK: ${chatLink}\nAtendente: ${atendente}\nCliente: ${cliente}\nSetor Umbler: ${setor}\n\n\nConversa:\n${mensagens}`;

                const payload = {
                    input: {
                        name: titulo,
                        content: conteudo,
                        status: 6,
                        date: dataHora,
                        '_itilrequesttypes_id': 13,
                    }
                };
                if (itilCategoryId !== null) payload.input.itilcategories_id = itilCategoryId;
                if (locationId !== null) payload.input.locations_id = locationId;

                const chamadoRes = await fetch(`${GLPI_URL}/Ticket`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'App-Token': APP_TOKEN,
                        'Session-Token': sessionToken
                    },
                    body: JSON.stringify(payload)
                });

                const resultado = await chamadoRes.json();
                if (resultado && resultado.id) {
                    alert(`✅ Chamado GLPI #${resultado.id} criado com sucesso!`);
                } else {
                    console.error("Erro GLPI:", resultado);
                    alert('❌ Erro ao criar chamado GLPI. Verifique o console e as configurações da extensão.');
                }

            } catch (error) {
                console.error("Erro no script:", error);
                alert('❌ Ocorreu um erro inesperado ao criar o chamado. Verifique o console e as configurações da extensão.');
            } finally {
                if (sessionToken) {
                    try {
                        await fetch(`${GLPI_URL}/killSession`, {
                            method: 'GET',
                            headers: {
                                'App-Token': APP_TOKEN,
                                'Session-Token': sessionToken
                            }
                        });
                    } catch (killError) {
                        console.error("Erro ao finalizar sessão GLPI:", killError);
                    }
                }
                sendButtons.forEach(button => {
                    button.disabled = false;
                    button.innerText = 'Enviar para o GLPI';
                    button.style.opacity = '1';
                    button.style.cursor = 'pointer';
                });
            }
        });
    }

    function createGLPIButton(idSuffix, positionClass) {
        const sendButton = document.createElement('button');
        sendButton.id = 'sendToGLPIButton-' + idSuffix;
        sendButton.classList.add('send-to-glpi-button', positionClass);
        sendButton.innerText = 'Enviar para o GLPI';
        sendButton.type = 'button';
        sendButton.classList.add('btn', 'btn-success', 'ls-xs');
        sendButton.onclick = function(event) {
            const chatContextElement = this.closest('.item-deferred-purge');

            if (!chatContextElement) {
                console.warn("Contexto do chat (.item-deferred-purge) não encontrado próximo ao botão. Verifique o seletor no script! Usando 'document' como fallback, o que pode levar a dados incorretos se múltiplos chats estiverem abertos ou se o chat não for o foco principal do documento.");
                sendToGLPI(document); 
            } else {
                console.log("Contexto do chat encontrado:", chatContextElement);
                sendToGLPI(chatContextElement);
            }
        };
        return sendButton;
    }

    let lastUrl = window.location.href;

    function manageButtonsOnChatPage() {
        const currentUrl = window.location.href;
        let shouldRemoveAndRecreate = false;

        if (currentUrl !== lastUrl) {
            shouldRemoveAndRecreate = true;
        } else if (currentUrl.includes('app-utalk.umbler.com/chats/')) {
            const bottomButtonExists = document.getElementById('sendToGLPIButton-bottom-position');
            const finalizedButtonExists = document.getElementById('sendToGLPIButton-finalized-position');
            // Seletores exatos da página do Umbler Talk para os locais de inserção dos botões
            const bottomContainerPresent = document.querySelector('div.d-flex.align-items-center.gap-2 > div.inset-control');
            const finalizedDivPresent = document.querySelector('div.fs-small.mb-auto');


            if ((bottomContainerPresent && !bottomButtonExists) || (!bottomContainerPresent && bottomButtonExists)) {
                shouldRemoveAndRecreate = true;
            }
            // Apenas verifica a presença do div finalizado; a checagem de texto é feita ao adicionar
            if ((finalizedDivPresent && !finalizedButtonExists) || (!finalizedDivPresent && finalizedButtonExists)) {
                 shouldRemoveAndRecreate = true;
            }
             // Adiciona verificação para recriar se nenhum botão existir e um local for encontrado
            if (!bottomButtonExists && bottomContainerPresent) {
                shouldRemoveAndRecreate = true;
            }
            if (!finalizedButtonExists && finalizedDivPresent && finalizedDivPresent.innerText.includes('Esta conversa foi finalizada.')) {
                shouldRemoveAndRecreate = true;
            }

        } else { // Se não estiver na página de chats
            if (document.querySelectorAll('.send-to-glpi-button').length > 0) {
                shouldRemoveAndRecreate = true; // Remove botões se sair da página de chats
            }
        }

        if (shouldRemoveAndRecreate) {
            // console.log("Removendo e recriando botões GLPI se necessário...");
            document.querySelectorAll('.send-to-glpi-button').forEach(button => button.remove());

            if (currentUrl.includes('app-utalk.umbler.com/chats/')) {
                // Lógica para adicionar botão no container inferior
                const bottomButtonsContainer = document.querySelector('div.d-flex.align-items-center.gap-2 > div.inset-control');
                if (bottomButtonsContainer && !document.getElementById('sendToGLPIButton-bottom-position')) {
                    const newButton = createGLPIButton('bottom-position', 'bottom-position');
                    bottomButtonsContainer.after(newButton);
                    // console.log("Botão GLPI adicionado (bottom).");
                }

                // Lógica para adicionar botão em chat finalizado
                const finalizedChatDiv = document.querySelector('div.fs-small.mb-auto');
                if (finalizedChatDiv && finalizedChatDiv.innerText.includes('Esta conversa foi finalizada.') && !document.getElementById('sendToGLPIButton-finalized-position')) {
                    const newButton = createGLPIButton('finalized-position', 'finalized-chat-position');
                    finalizedChatDiv.after(newButton);
                    // console.log("Botão GLPI adicionado (finalized).");
                }
            }
            lastUrl = currentUrl;
        }
    }
    // Garante que a lógica de botões seja executada um pouco depois do carregamento inicial
    // para dar tempo à página de renderizar seus elementos dinâmicos.
    setTimeout(() => {
        manageButtonsOnChatPage(); // Chamada inicial
        setInterval(manageButtonsOnChatPage, 750); // Intervalo de verificação
    }, 1000); // Delay inicial antes de começar a verificar
})();
