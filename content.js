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

    // Função para coletar dados da div do SII, agora da div.row
    function collectSiiData() {
        const fullContentDiv = document.querySelector('div.row'); // Agora pega a div.row
        const siiDiv = document.querySelector('div.p-3.bg-light.border.border-2.rounded'); // Ainda usada para algumas extrações seletivas
        const subjectDiv = document.querySelector('div.col-md-6'); // Para o assunto do chamado

        if (!fullContentDiv) {
            console.warn("DIV 'div.row' de dados do SII não encontrada.");
            return null;
        }

        const fullContent = fullContentDiv.innerText;
        let cliente = 'Cliente Desconhecido';
        let modulo = 'Módulo Desconhecido';
        let local = 'Local Desconhecido';
        let sistemaUrl = '';

        // Tenta pegar informações da siiDiv se ela existir, pois tem um formato mais previsível
        if (siiDiv) {
            const siiContent = siiDiv.innerText;
            const clientMatch = siiContent.match(/Cliente: (.+)/);
            if (clientMatch) {
                cliente = clientMatch[1].trim().split(' - ')[0];
            }

            const moduloMatch = siiContent.match(/Módulo: (.+)/);
            if (moduloMatch) {
                modulo = moduloMatch[1].trim();
            }

            const localMatch = siiContent.match(/Local:\s*([\s\S]+?)(?=(?:https:\/\/|\n\n|$))/);
            if (localMatch) {
                local = localMatch[1].trim();
            }

            const urlMatch = siiContent.match(/(https:\/\/[a-zA-Z0-9.-]+\.gov\.br\/)/);
            if (urlMatch) {
                sistemaUrl = urlMatch[1].trim();
            }
        } else { // Fallback para a fullContent se siiDiv não for encontrada
            const clientMatch = fullContent.match(/Cliente: (.+)/);
            if (clientMatch) {
                cliente = clientMatch[1].trim().split(' - ')[0];
            }

            const moduloMatch = fullContent.match(/Módulo: (.+)/);
            if (moduloMatch) {
                modulo = moduloMatch[1].trim();
            }

            const localMatch = fullContent.match(/Local:\s*([\s\S]+?)(?=(?:https:\/\/|\n\n|$))/);
            if (localMatch) {
                local = localMatch[1].trim();
            }

            const urlMatch = fullContent.match(/(https:\/\/[a-zA-Z0-9.-]+\.gov\.br\/)/);
            if (urlMatch) {
                sistemaUrl = urlMatch[1].trim();
            }
        }


        // Extrair número do chamado do link
        const urlParts = window.location.href.split('/');
        const numeroChamado = urlParts[urlParts.length - 1]; // Pega o último segmento da URL

        // Extrair assunto do chamado da div.col-md-6
        let assuntoChamado = 'Assunto Desconhecido';
        if (subjectDiv) {
            assuntoChamado = subjectDiv.innerText.trim();
        }

        // Formato do título: (CH Nª CHAMADO) ASSUNTO DO CHAMADO
        const titulo = `(CH ${numeroChamado}) ${assuntoChamado}`;


        // Determinar o setor com base na URL do sistema
        let setor = '';
        if (sistemaUrl.includes('gmus')) {
            setor = 'G-MUS';
        } else if (sistemaUrl.includes('ghosp')) {
            setor = 'G-HOSP';
        } else if (sistemaUrl.includes('gvis')) {
            setor = 'G-VIS';
        }

        // Determinar a subcategoria (RG para módulo de regulação)
        let itilCategoryId = null;
        if (setor && CATEGORY_MAP[setor]) {
            itilCategoryId = CATEGORY_MAP[setor].id; // Categoria principal
            if (modulo.toUpperCase().includes('REGULAÇÃO') && CATEGORY_MAP[setor].subcategories['RG']) {
                itilCategoryId = CATEGORY_MAP[setor].subcategories['RG'];
            }
        }

        // Determinar o locationId com base no cliente e setor
        let locationId = null;
        if (setor && LOCATION_MAP[setor]) {
            const locationsForSector = LOCATION_MAP[setor];
            const standardizedCliente = standardizeString(cliente);
            for (const mapLocationName in locationsForSector) {
                const standardizedMapLocationName = standardizeString(mapLocationName);
                if (standardizedCliente.includes(standardizedMapLocationName) || standardizedMapLocationName.includes(standardizedCliente)) {
                    locationId = locationsForSector[mapLocationName];
                    break;
                }
            }
            if (locationId === null) { // Tenta encontrar pelo local
                const standardizedLocal = standardizeString(local);
                for (const mapLocationName in locationsForSector) {
                    const standardizedMapLocationName = standardizeString(mapLocationName);
                    if (standardizedLocal.includes(standardizedMapLocationName) || standardizedMapLocationName.includes(standardizedLocal)) {
                        locationId = locationsForSector[mapLocationName];
                        break;
                    }
                }
            }
        }

        const now = new Date();
        const dataHora = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

        return {
            titulo: titulo,
            conteudo: fullContent, // Agora pegando todo o conteúdo da div.row
            cliente: cliente,
            setor: setor,
            itilCategoryId: itilCategoryId,
            locationId: locationId,
            status: 4, // Status sempre PENDENTE
            requestType: 13, // RequestType sempre 13
            dataHora: dataHora,
            originalLink: window.location.href // Captura o link da página atual do SII
        };
    }

    async function sendToGLPI(dataToUse) {
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

            let titulo, conteudo, itilCategoryId, locationId, status, requestType, dataHora;

            // Determine if dataToUse is a chat context element or directly the collected data
            if (dataToUse && dataToUse.originalLink && dataToUse.titulo.startsWith('(CH ')) { // É um dado coletado do SII
                titulo = dataToUse.titulo;
                conteudo = dataToUse.conteudo + `\n\nLink Original do Chamado SII: ${dataToUse.originalLink}`;
                itilCategoryId = dataToUse.itilCategoryId;
                locationId = dataToUse.locationId;
                status = dataToUse.status;
                requestType = dataToUse.requestType;
                dataHora = dataToUse.dataHora;
            } else { // É o elemento de contexto do chat (comportamento original do Umbler)
                const chatContextElement = dataToUse;
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

                itilCategoryId = null;
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

                locationId = null;
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

                titulo = `Atendimento com ${cliente}`;
                const atendenteSignatureElement = chatContextElement.querySelector('.signature-text.fw-bold');
                let atendente = atendenteSignatureElement ? atendenteSignatureElement.innerText.trim() : 'Atendente Desconhecido';

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
                dataHora = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
                const chatLink = window.location.href;
                conteudo = `LINK: ${chatLink}\nAtendente: ${atendente}\nCliente: ${cliente}\nSetor Umbler: ${setor}\n\n\nConversa:\n${mensagens}`;
                status = 6; // Status original para chamados de chat
                requestType = 13; // RequestType original para chamados de chat
            }

            const categoriaExibicao = getCategoryNameById(itilCategoryId, dataToUse.setor || '');
            const localizacaoExibicao = getLocationNameById(locationId, dataToUse.setor || '');

            const confirmationMessage = `Tem certeza que deseja enviar para o GLPI?\n\n` +
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

                const payload = {
                    input: {
                        name: titulo,
                        content: conteudo,
                        status: status,
                        date: dataHora,
                        '_itilrequesttypes_id': requestType,
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

    function createGLPIButton(idSuffix, positionClass, clickHandler) {
        const sendButton = document.createElement('button');
        sendButton.id = 'sendToGLPIButton-' + idSuffix;
        sendButton.classList.add('send-to-glpi-button', positionClass);
        sendButton.innerText = 'Enviar para o GLPI';
        sendButton.type = 'button';
        sendButton.classList.add('btn', 'btn-success', 'ls-xs');
        sendButton.onclick = clickHandler;
        return sendButton;
    }

    let lastUrl = window.location.href;

    function manageButtonsOnCurrentPage() {
        const currentUrl = window.location.href;
        let shouldRemoveAndRecreate = false;

        if (currentUrl !== lastUrl) {
            shouldRemoveAndRecreate = true;
        }

        const isUmblerTalkPage = currentUrl.includes('app-utalk.umbler.com/chats/');
        const isSiiPage = currentUrl.includes('sii.inovadora.com.br/chamadas/mostrar/id/');

        const bottomButtonExists = document.getElementById('sendToGLPIButton-bottom-position');
        const finalizedButtonExists = document.getElementById('sendToGLPIButton-finalized-position');
        const bottomContainerPresent = document.querySelector('div.d-flex.align-items-center.gap-2 > div.inset-control');
        const finalizedDivPresent = document.querySelector('div.fs-small.mb-auto');

        const siiButtonExists = document.getElementById('sendToGLPIButton-sii-data');
        const pageTitPresent = document.getElementById('page-tit');
        const siiDivContentPresent = document.querySelector('div.row'); // Agora verificamos a div.row para o botão SII

        if (isUmblerTalkPage) {
            if ((bottomContainerPresent && !bottomButtonExists) || (!bottomContainerPresent && bottomButtonExists) ||
                (finalizedDivPresent && !finalizedButtonExists) || (!finalizedDivPresent && finalizedButtonExists)) {
                shouldRemoveAndRecreate = true;
            }
            if (siiButtonExists) {
                shouldRemoveAndRecreate = true;
            }
        } else if (isSiiPage) {
            // AQUI É O AJUSTE CHAVE: Verifica se pageTitPresent e siiDivContentPresent (div.row) existem para o botão SII
            if ((pageTitPresent && siiDivContentPresent && !siiButtonExists) || (!pageTitPresent && siiButtonExists) || (!siiDivContentPresent && siiButtonExists)) {
                shouldRemoveAndRecreate = true;
            }
            if (bottomButtonExists || finalizedButtonExists) {
                shouldRemoveAndRecreate = true;
            }
        } else {
            if (document.querySelectorAll('.send-to-glpi-button').length > 0) {
                shouldRemoveAndRecreate = true;
            }
        }

        if (shouldRemoveAndRecreate) {
            document.querySelectorAll('.send-to-glpi-button').forEach(button => button.remove());

            if (isUmblerTalkPage) {
                if (bottomContainerPresent && !document.getElementById('sendToGLPIButton-bottom-position')) {
                    const newButton = createGLPIButton('bottom-position', 'bottom-position', function() {
                        const chatContextElement = this.closest('.item-deferred-purge');
                        if (!chatContextElement) {
                            console.warn("Contexto do chat (.item-deferred-purge) não encontrado próximo ao botão. Usando 'document' como fallback.");
                            sendToGLPI(document);
                        } else {
                            sendToGLPI(chatContextElement);
                        }
                    });
                    bottomContainerPresent.after(newButton);
                }

                if (finalizedDivPresent && finalizedDivPresent.innerText.includes('Esta conversa foi finalizada.') && !document.getElementById('sendToGLPIButton-finalized-position')) {
                    const newButton = createGLPIButton('finalized-position', 'finalized-chat-position', function() {
                        const chatContextElement = this.closest('.item-deferred-purge');
                        if (!chatContextElement) {
                            console.warn("Contexto do chat (.item-deferred-purge) não encontrado próximo ao botão. Usando 'document' como fallback.");
                            sendToGLPI(document);
                        } else {
                            sendToGLPI(chatContextElement);
                        }
                    });
                    finalizedDivPresent.after(newButton);
                }
            } else if (isSiiPage) {
                // AQUI É O AJUSTE CHAVE: Verifica se pageTitPresent e siiDivContentPresent (div.row) existem
                if (pageTitPresent && siiDivContentPresent && !document.getElementById('sendToGLPIButton-sii-data')) {
                    const newSiiButton = createGLPIButton('sii-data', 'sii-data-position', function() {
                        const siiData = collectSiiData();
                        if (siiData) {
                            sendToGLPI(siiData);
                        } else {
                            alert('Não foi possível coletar os dados do SII. Verifique se as divs necessárias estão presentes.');
                        }
                    });
                    pageTitPresent.appendChild(newSiiButton);
                    newSiiButton.style.marginLeft = '10px';
                }
            }
            lastUrl = currentUrl;
        }
    }

    setTimeout(() => {
        manageButtonsOnCurrentPage();
        setInterval(manageButtonsOnCurrentPage, 750);
    }, 1000);
})();