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
        'G-VIS': { id: 36 },
        'IVI': { id: 36 }
    };

    const LOCATION_MAP = {
        'G-MUS': {
            'XANGRILA': 6, 'TRAMANDAI': 8, 'TUPANDI': 17, 'CAPE': 26, 'LAGOA NOVA': 19,
            'BARRACAO': 4, 'CAMINHOS DO SOL': 12, 'GIRASSOL': 11
        },
        'G-VIS': { 'XANGRILA': 24, 'TRAMANDAI': 23 },
        'G-HOSP': {
            'BARRACAO': 3, 'IB SAUDE': 10, 'FELIZ': 1, 'ITATIBA DO SUL': 9,
            'LAGOA NOVA': 20, 'NITEROI': 22, 'PARAI': 25, 'RIOZINHO': 21,
            'SALDANHA MARINHO': 2, 'TRAMANDAI': 7, 'XANGRILA': 5
        }
    };


    const SII_CLIENT_TO_LOCATION_ID_MAP = {
        'G-HOSP': {
            'ASSOCDESAUDEDEFELIZHOSPSCHALATTER': 1,
            'HOSPITALBENEFICENTENSRAAPARECIDA': 25,
            'HOSPITALNOSSASENHORADOROSARIO':    21,
            'IBSAUDE':                          10,
            'IBSAUDEHOSPMUNSALDANHAMARINHO':    2,
            'IBSAUDEUPANITEROI':                22,
            'PREFEITURAMUNICIPALDEBARRACAOSMS': 3,
            'PREFEITURAMUNICIPALDEITATIBADOSUL':9,
            'PREFEITURAMUNICIPALDETRAMANDAI':   7,
            'PREFEITURAMUNICIPALDEXANGRILA':    5
        },
        'G-MUS': {
            'FUNDOMUNICIPALDESAUDELAGOANOVA': 19, 
            'IBSAUDECAPS':                    11,
            'IBSAUDECAPSPOAZONALESTE':        12,
            'PREFEITURAMUNICIPALDETRAMANDAI': 8,
            'PREFEITURAMUNICIPALDETUPANDI':   17,
            'PREFEITURAMUNICIPALDEXANGRILA':  6
            
        },
        'G-VIS': {
            'PREFEITURAMUNICIPALDETRAMANDAI': 23,
            'PREFEITURAMUNICIPALDEXANGRILA':  24
        }
    };

    const SII_MODULE_TO_ABBREV = {
        // G-HOSP Modules
        'CGCADASTROSGERAIS': 'CG',
        'PMPAM': 'PM',
        'PNPAINELDECHAMADA': 'PN',
        'PRPRESCRICAO': 'PR',
        'RDDIAGNOSTICOPORIMAGEM': 'RD',
        'NTNUTRICAO': 'NT',
        'RCRECEPCAO': 'RC',
        'STESTOQUE': 'ST',       

        // G-MUS Modules
        'ATENCAOPRIMARIAAPLICATIVOMOVEL': 'ACS',     
        'AUTORIZACAODEEXAMESEPROCEDIMENTOS': 'AE',
        'CADASTROS': 'CG',                 
        'AGENDA': 'GD',                       
        'PRODUCAOAMBULATORIAL': 'PM',   
        'PRONTUARIOELETRONICO': 'PR',  
        'TRANSPORTE': 'TR',             
        'IMUNIZACOES': 'VC',             
        'VIGILANCIAEPIDEMIOLOGICA': 'VP',
        'ESTOQUE': 'ST',
        'REGULACAO': 'RG'
           
    };

    const SII_SECTOR_TO_KEY = {
        'GMUS': 'G-MUS',
        'GHOSP': 'G-HOSP',
        'GVIS': 'G-VIS',
        'Ivi': 'Ivi'
    };

    const standardizeString = (str) => {
        if (typeof str !== 'string') return '';
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
                    return `${sector} > ${subName}`;
                }
            }
        }
        return `Desconhecida (ID: ${categoryId}, Setor: ${sector})`;
    };

    const getLocationNameById = (locationId, sector) => {
        if (!locationId || !sector || !LOCATION_MAP[sector]) return 'Desconhecida';
        const locationsForSector = LOCATION_MAP[sector];
        for (const locName in locationsForSector) {
            if (locationsForSector[locName] === locationId) {
                return locName; 
            }
        }
        return `Desconhecida (ID: ${locationId}, Setor: ${sector})`;
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
                        if (standardizeString(mapLocationName).startsWith(umblerTag) || umblerTag.startsWith(standardizeString(mapLocationName))) {
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
                    headers: { 'App-Token': APP_TOKEN, 'Authorization': `Basic ${base64Auth}` }
                });
                const loginData = await loginRes.json();
                if (!loginData?.session_token) {
                    alert('Erro ao autenticar no GLPI. Verifique as credenciais e configurações da API.');
                    throw new Error("GLPI Login failed");
                }
                sessionToken = loginData.session_token;

                let atendente = 'Atendente Desconhecido';
                const atendenteSignatureElement = chatContextElement.querySelector('.signature-text.fw-bold');
                if (atendenteSignatureElement) atendente = atendenteSignatureElement.innerText.trim();

                const formattedMessages = [];
                const allMessageElements = chatContextElement.querySelectorAll('.chat-message-member, .chat-message-contact');
                allMessageElements.forEach(el => {
                    const messageText = el.innerText.trim();
                    if (el.classList.contains('chat-message-member')) formattedMessages.push(messageText);
                    else if (el.classList.contains('chat-message-contact')) formattedMessages.push(`${cliente}: ${messageText}`);
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
                        requesttypes_id: 13
                    }
                };
                if (itilCategoryId !== null) payload.input.itilcategories_id = itilCategoryId;
                if (locationId !== null) payload.input.locations_id = locationId;

                const chamadoRes = await fetch(`${GLPI_URL}/Ticket`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'App-Token': APP_TOKEN, 'Session-Token': sessionToken },
                    body: JSON.stringify(payload)
                });
                const resultado = await chamadoRes.json();
                if (resultado && resultado.id) {
                    alert(`✅ Chamado GLPI #${resultado.id} criado com sucesso!`);
                } else {
                    console.error("Erro GLPI:", resultado);
                    alert('❌ Erro ao criar chamado GLPI. Verifique o console.');
                }
            } catch (error) {
                console.error("Erro no script (sendToGLPI):", error);
                alert('❌ Ocorreu um erro inesperado. Verifique o console.');
            } finally {
                if (sessionToken) {
                    try { await fetch(`${GLPI_URL}/killSession`, { method: 'GET', headers: { 'App-Token': APP_TOKEN, 'Session-Token': sessionToken } }); }
                    catch (killError) { console.error("Erro ao finalizar sessão GLPI:", killError); }
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

    async function sendSiiDataToGLPI() {
        const siiButton = document.getElementById('sendToGLPISiiButton');
        if (siiButton) {
            siiButton.disabled = true;
            siiButton.innerText = 'Coletando dados...';
            siiButton.style.opacity = '0.6';
            siiButton.style.cursor = 'not-allowed';
        }

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
                if (siiButton) {
                    siiButton.disabled = false;
                    siiButton.innerText = 'ENVIAR PARA O GLPI';
                    siiButton.style.opacity = '1';
                    siiButton.style.cursor = 'pointer';
                }
                return;
            }

            const base64Auth = btoa(`${USERNAME}:${PASSWORD}`);

            const callIdMatch = window.location.pathname.match(/chamadas\/mostrar\/id\/(\d+)/);
            const callNumber = callIdMatch ? callIdMatch[1] : 'Desconhecido';

            const subjectElement = document.querySelector('div.col-md-6 > h5:first-of-type + h6 > small');
            const subject = subjectElement ? (subjectElement.innerText || subjectElement.textContent || "").trim() : 'Assunto Desconhecido';
            const glpiTitle = `(CH ${callNumber}) ${subject}`;

            const descriptionContainerElement = document.querySelector('.p-3.bg-light.border.border-2.rounded');
            const rawDescription = descriptionContainerElement ? (descriptionContainerElement.innerText || descriptionContainerElement.textContent || "").trim() : 'Descrição não encontrada.';
            const currentPageLink = window.location.href;
            const glpiContent = `LINK: ${currentPageLink}\n==CONTEÚDO==\n${rawDescription}`;

            let extractedSectorKey = null;
            let extractedSubcategoryAbbrev = null;
            let extractedLocationName = null;      
            let originalClientNameFromHeader = null; 
            let rawModuleNameFromHeader = null;

            const headerDetailsSection = document.querySelector('.bs-callout .row > .col-md-6 .row');
            if (headerDetailsSection) {
                const h6Elements = headerDetailsSection.querySelectorAll('h6');
                h6Elements.forEach(h6 => {
                    const textContent = h6.textContent || h6.innerText || "";
                    const smallElement = h6.querySelector('small.fw-normal');
                    const value = smallElement ? (smallElement.innerText || smallElement.textContent || "").trim() : '';

                    if (value) {
                        if (textContent.includes('Módulo:')) {
                            rawModuleNameFromHeader = value;
                        } else if (textContent.includes('Cliente:')) {
                            originalClientNameFromHeader = value; 
                            extractedLocationName = standardizeString(value); 
                        } else if (textContent.includes('Sistema:')) {
                            const sectorCandidate = value.toUpperCase();
                            if (CATEGORY_MAP[sectorCandidate] && (LOCATION_MAP[sectorCandidate] || SII_CLIENT_TO_LOCATION_ID_MAP[sectorCandidate])) { // Verifica se o setor é válido em algum mapa relevante
                                extractedSectorKey = sectorCandidate;
                            } else {
                                console.warn(`Sistema/Setor "${value}" (padronizado: "${sectorCandidate}") extraído do cabeçalho não é uma chave válida nos mapas. Verifique o HTML ou os mapas.`);
                            }
                        }
                    }
                });
            }

            if (rawModuleNameFromHeader) {
                const standardizedModuleName = standardizeString(rawModuleNameFromHeader);
                if (SII_MODULE_TO_ABBREV[standardizedModuleName]) {
                    extractedSubcategoryAbbrev = SII_MODULE_TO_ABBREV[standardizedModuleName];
                } else {
                    console.warn(`Módulo SII "${rawModuleNameFromHeader}" (padronizado: "${standardizedModuleName}") do cabeçalho não encontrado no mapa SII_MODULE_TO_ABBREV.`);
                }
            }

            if (descriptionContainerElement && (!extractedSectorKey || !extractedSubcategoryAbbrev || !extractedLocationName)) {
                console.log("Fallback para descrição: Setor?", !!extractedSectorKey, "Módulo?", !!extractedSubcategoryAbbrev, "Local?", !!extractedLocationName);
                const descriptionLines = rawDescription.split('\n');
                for (let i = 0; i < descriptionLines.length; i++) {
                    const line = descriptionLines[i].trim();
                    if (!extractedSectorKey && (line.toUpperCase() === '🔹 LOCAL:' || line.toUpperCase() === 'LOCAL:')) {
                        if (descriptionLines[i + 1]) {
                            const sectorCandidateFromDesc = descriptionLines[i + 1].trim().toUpperCase();
                            if (SII_SECTOR_TO_KEY[sectorCandidateFromDesc]) {
                                extractedSectorKey = SII_SECTOR_TO_KEY[sectorCandidateFromDesc];
                            }
                        }
                    }
                    if (!extractedSubcategoryAbbrev && line.toUpperCase().startsWith('MÓDULO:')) {
                        const rawModuleNameFromDesc = line.substring('MÓDULO:'.length).trim();
                        const standardizedModuleNameFromDesc = standardizeString(rawModuleNameFromDesc);
                        if (SII_MODULE_TO_ABBREV[standardizedModuleNameFromDesc]) {
                            extractedSubcategoryAbbrev = SII_MODULE_TO_ABBREV[standardizedModuleNameFromDesc];
                        } else {
                             console.warn(`Módulo SII da descrição "${rawModuleNameFromDesc}" (padronizado: "${standardizedModuleNameFromDesc}") não encontrado.`);
                        }
                    }
                    if (!extractedLocationName && line.toUpperCase().startsWith('CLIENTE:')) {
                        const clientLineContent = line.substring('CLIENTE:'.length).trim();
                        const clientLineParts = clientLineContent.split(' - ');
                        if (clientLineParts.length > 0) {
                            originalClientNameFromHeader = null; 
                            extractedLocationName = standardizeString(clientLineParts[0].trim());
                        }
                    }
                }
            }
            
            let itilCategoryId = null;
            if (extractedSectorKey && CATEGORY_MAP[extractedSectorKey]) {
                const mainCategory = CATEGORY_MAP[extractedSectorKey];
                itilCategoryId = mainCategory.id;
                if (extractedSubcategoryAbbrev && mainCategory.subcategories && mainCategory.subcategories[extractedSubcategoryAbbrev]) {
                    itilCategoryId = mainCategory.subcategories[extractedSubcategoryAbbrev];
                } else if (extractedSubcategoryAbbrev) {
                    console.warn(`Subcategoria "${extractedSubcategoryAbbrev}" não para setor "${extractedSectorKey}" no CATEGORY_MAP.`);
                }
            } else if (extractedSectorKey) {
                console.warn(`Setor "${extractedSectorKey}" não no CATEGORY_MAP.`);
            }

            
            let locationId = null;
            if (extractedSectorKey && extractedLocationName) {
                if (SII_CLIENT_TO_LOCATION_ID_MAP[extractedSectorKey] &&
                    SII_CLIENT_TO_LOCATION_ID_MAP[extractedSectorKey][extractedLocationName]) {
                    locationId = SII_CLIENT_TO_LOCATION_ID_MAP[extractedSectorKey][extractedLocationName];
                } else {
                    console.warn(`Cliente SII "${originalClientNameFromHeader || extractedLocationName}" (padronizado: "${extractedLocationName}") não encontrado no SII_CLIENT_TO_LOCATION_ID_MAP para o setor "${extractedSectorKey}". Verifique o mapa e os IDs GLPI.`);
                }
            } else if (extractedLocationName) { 
                console.warn(`Localização (Cliente SII) "${originalClientNameFromHeader || extractedLocationName}" não pode ser mapeada pois o setor "${extractedSectorKey}" é inválido ou não foi extraído.`);
            }
            
            const categoriaExibicao = getCategoryNameById(itilCategoryId, extractedSectorKey);
            let localizacaoParaExibicao = 'Não Definida';
            if (locationId !== null) {
                if (originalClientNameFromHeader && extractedSectorKey && SII_CLIENT_TO_LOCATION_ID_MAP[extractedSectorKey] && SII_CLIENT_TO_LOCATION_ID_MAP[extractedSectorKey][extractedLocationName] === locationId) {
                    localizacaoParaExibicao = originalClientNameFromHeader; 
                } else if (extractedLocationName) {
                    localizacaoParaExibicao = extractedLocationName; 
                }
            }

            const confirmationMessage = `Tem certeza que deseja enviar este chamado para o GLPI?\n\n` +
                                      `TÍTULO: ${glpiTitle}\n` +
                                      `CATEGORIA: ${categoriaExibicao || 'Não Definida'}\n` +
                                      `LOCALIZAÇÃO (Cliente SII): ${localizacaoParaExibicao}\n\n` +
                                      `Clique em OK para confirmar ou Cancelar para abortar.`;

            const confirmSend = confirm(confirmationMessage);
            if (!confirmSend) {
                if (siiButton) {
                    siiButton.disabled = false;
                    siiButton.innerText = 'ENVIAR PARA O GLPI';
                    siiButton.style.opacity = '1';
                    siiButton.style.cursor = 'pointer';
                }
                return;
            }

            if (siiButton) siiButton.innerText = 'Enviando...';

            let sessionToken;
            try {
                const loginRes = await fetch(`${GLPI_URL}/initSession`, {
                    method: 'GET',
                    headers: { 'App-Token': APP_TOKEN, 'Authorization': `Basic ${base64Auth}` }
                });
                const loginData = await loginRes.json();
                if (!loginData?.session_token) {
                    alert('Erro ao autenticar no GLPI. Verifique as credenciais e configurações da API.');
                    throw new Error("GLPI Login failed");
                }
                sessionToken = loginData.session_token;

                const now = new Date();
                const dataHora = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

                const payload = {
                    input: {
                        name: glpiTitle,
                        content: glpiContent,
                        status: 4, 
                        date: dataHora,
                        requesttypes_id: 10
                    }
                };
                if (itilCategoryId !== null) payload.input.itilcategories_id = itilCategoryId;
                if (locationId !== null) payload.input.locations_id = locationId;

                const chamadoRes = await fetch(`${GLPI_URL}/Ticket`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'App-Token': APP_TOKEN, 'Session-Token': sessionToken },
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
                console.error("Erro no script (sendSiiDataToGLPI):", error);
                alert('❌ Ocorreu um erro inesperado ao criar o chamado. Verifique o console e as configurações da extensão.');
            } finally {
                if (sessionToken) {
                    try { await fetch(`${GLPI_URL}/killSession`, { method: 'GET', headers: { 'App-Token': APP_TOKEN, 'Session-Token': sessionToken } }); }
                    catch (killError) { console.error("Erro ao finalizar sessão GLPI:", killError); }
                }
                if (siiButton) {
                    siiButton.disabled = false;
                    siiButton.innerText = 'ENVIAR PARA O GLPI';
                    siiButton.style.opacity = '1';
                    siiButton.style.cursor = 'pointer';
                }
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
                console.warn("Contexto do chat (.item-deferred-purge) não encontrado. Usando 'document' como fallback.");
                sendToGLPI(document); 
            } else {
                sendToGLPI(chatContextElement);
            }
        };
        return sendButton;
    }

    function createSiiGLPIButton() {
        const buttonId = 'sendToGLPISiiButton';
        const sendButton = document.createElement('button');
        sendButton.id = buttonId;
        sendButton.innerText = 'ENVIAR PARA O GLPI';
        sendButton.type = 'button';
        sendButton.className = 'btn btn-info btn-sm pull-right'; 
        sendButton.style.marginLeft = '10px'; 
        sendButton.style.verticalAlign = 'middle'; 
        sendButton.onclick = function(event) {
            sendSiiDataToGLPI();
        };
        return sendButton;
    }

    let lastProcessedUrlForButtons = '';

    function manageButtons() {
        const currentUrl = window.location.href;

        if (currentUrl === lastProcessedUrlForButtons && 
            (document.querySelector('.send-to-glpi-button') || document.getElementById('sendToGLPISiiButton'))) {
            return;
        }
        
        document.querySelectorAll('.send-to-glpi-button, #sendToGLPISiiButton').forEach(button => button.remove());

        if (currentUrl.includes('app-utalk.umbler.com/chats/')) {
            const bottomContainer = document.querySelector('div.d-flex.align-items-center.gap-2 > div.inset-control');
            if (bottomContainer && !document.getElementById('sendToGLPIButton-bottom-position')) {
                const umblerButtonBottom = createGLPIButton('bottom-position', 'bottom-position');
                bottomContainer.after(umblerButtonBottom);
            }
            const finalizedDiv = document.querySelector('div.fs-small.mb-auto');
            if (finalizedDiv && (finalizedDiv.innerText || finalizedDiv.textContent || "").includes('Esta conversa foi finalizada.') && !document.getElementById('sendToGLPIButton-finalized-position')) {
                const umblerButtonFinalized = createGLPIButton('finalized-position', 'finalized-chat-position');
                finalizedDiv.after(umblerButtonFinalized);
            }
        } else if (currentUrl.match(/sii\.inovadora\.com\.br\/chamadas\/mostrar\/id\/\d+/)) {
            const titleDiv = document.getElementById('page-tit');
            const h3Element = titleDiv ? titleDiv.querySelector('h3') : null;
            if (h3Element && !document.getElementById('sendToGLPISiiButton')) {
                const siiButton = createSiiGLPIButton();
                if (siiButton) {
                    h3Element.appendChild(siiButton);
                }
            }
        }
        lastProcessedUrlForButtons = currentUrl;
    }

    setTimeout(() => {
        manageButtons(); 
        setInterval(manageButtons, 750); 
    }, 1000);

})();