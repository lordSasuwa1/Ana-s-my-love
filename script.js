// SITE ROUGE - FLAMME ETERNELLE - AVEC SUPABASE

// Tables Supabase (créez-les dans votre dashboard Supabase)
const TABLE_MESSAGES = 'messages_rouge';
const TABLE_DESSINS = 'dessins_rouge';
const TABLE_DESIRS = 'desirs_rouge';
const TABLE_PHOTOS_RECTO = 'photos_recto_rouge';
const TABLE_PHOTOS_VERSO = 'photos_verso_rouge';

const AppState = {
  canvas: null,
  ctx: null,
  isDrawing: false,
  currentTool: 'brush',
  currentColor: '#dc143c',
  currentSize: 5,
  modalOuverte: null,
  modeEdition: false,
  itemEnEdition: null,
  ongletGalerieActif: 'recto',
  audioPlayer: null,
  currentTrackIndex: -1
};

const PLAYLIST = [
  {titre: 'Chanson 1', artiste: 'Artiste 1', pensee: ' mon morceau pref du moment. 🙂‍↕️', fichier: 'musique/01-chanson.mp3'},
  {titre: 'Chanson 2', artiste: 'Artiste 2', pensee: 'Je te donne tout de moi, sans réserve. 🔥', fichier: 'musique/02-chanson.mp3'},
  {titre: 'montagem rugada', artiste: 'Artiste 3', pensee: 'discutable....🤷😛', fichier: 'musique/03-chanson.mp3'},
  {titre: 'Chanson 4', artiste: 'Artiste 4', pensee: ' Imagine toi dans un edit mdr! 🤣', fichier: 'musique/04-chanson.mp3'},
  {titre: 'Chanson 5', artiste: 'Artiste 5', pensee: 'you got me! 🔥💖', fichier: 'musique/05-chanson.mp3'},
  {titre: 'Chanson 6', artiste: 'Artiste 6', pensee: 'Cette chanson est pour toi. non c/est pour troll', fichier: 'musique/06-chanson.mp3'},
  {titre: 'Chanson 7', artiste: 'Artiste 7', pensee: ' Doux rêves 🫠', fichier: 'musique/07-chanson.mp3'},
  {titre: 'Chanson 8', artiste: 'Artiste 8', pensee: 'Je kiff trop 💕', fichier: 'musique/08-chanson.mp3'}
];

// Initialisation
document.addEventListener('DOMContentLoaded', async function() {
  console.log('🎨 Initialisation...');
  initialiserCanvas();
  initialiserEvenements();
  initialiserLecteurAudio();
  afficherPlaylist();
  await chargerDonneesSupabase();
  demarrerAnimations();
});

function initialiserCanvas() {
  AppState.canvas = document.getElementById('canvas-dessin');
  if (AppState.canvas) {
    AppState.ctx = AppState.canvas.getContext('2d');
    AppState.ctx.lineJoin = 'round';
    AppState.ctx.lineCap = 'round';
    AppState.ctx.fillStyle = 'white';
    AppState.ctx.fillRect(0, 0, AppState.canvas.width, AppState.canvas.height);
  }
}

function initialiserEvenements() {
  document.getElementById('btn-nouveau-message')?.addEventListener('click', ouvrirModalNouveauMessage);
  document.getElementById('form-message')?.addEventListener('submit', e => { e.preventDefault(); sauvegarderMessage(); });
  document.getElementById('input-message')?.addEventListener('input', e => document.getElementById('count-chars').textContent = e.target.value.length);
  
  document.getElementById('btn-nouveau-desir')?.addEventListener('click', ouvrirModalNouveauDesir);
  document.getElementById('form-desir')?.addEventListener('submit', e => { e.preventDefault(); sauvegarderDesir(); });
  document.getElementById('filtre-categorie')?.addEventListener('change', filtrerDesirs);
  document.getElementById('filtre-statut')?.addEventListener('change', filtrerDesirs);
  
  document.getElementById('upload-recto')?.addEventListener('change', e => ajouterPhotos(e, 'recto'));
  document.getElementById('upload-verso')?.addEventListener('change', e => ajouterPhotos(e, 'verso'));
  document.getElementById('form-photo')?.addEventListener('submit', e => { e.preventDefault(); sauvegarderInfoPhoto(); });
  
  if (AppState.canvas) {
    AppState.canvas.addEventListener('mousedown', demarrerDessin);
    AppState.canvas.addEventListener('mousemove', dessiner);
    AppState.canvas.addEventListener('mouseup', arreterDessin);
    AppState.canvas.addEventListener('mouseout', arreterDessin);
    AppState.canvas.addEventListener('touchstart', e => { 
      e.preventDefault(); 
      const touch = e.touches[0]; 
      const rect = AppState.canvas.getBoundingClientRect();
      const mouseEvent = new MouseEvent('mousedown', {
        clientX: touch.clientX,
        clientY: touch.clientY
      });
      AppState.canvas.dispatchEvent(mouseEvent);
    }, {passive: false});
    AppState.canvas.addEventListener('touchmove', e => { 
      e.preventDefault(); 
      const touch = e.touches[0]; 
      const mouseEvent = new MouseEvent('mousemove', {
        clientX: touch.clientX,
        clientY: touch.clientY
      });
      AppState.canvas.dispatchEvent(mouseEvent);
    }, {passive: false});
    AppState.canvas.addEventListener('touchend', e => { 
      e.preventDefault(); 
      AppState.canvas.dispatchEvent(new MouseEvent('mouseup', {})); 
    }, {passive: false});
  }
  
  document.querySelectorAll('.btn-outil').forEach(btn => btn.addEventListener('click', function() {
    document.querySelectorAll('.btn-outil').forEach(b => b.classList.remove('active'));
    this.classList.add('active');
    AppState.currentTool = this.dataset.outil;
  }));
  
  document.querySelectorAll('.btn-couleur').forEach(btn => btn.addEventListener('click', function() {
    document.querySelectorAll('.btn-couleur').forEach(b => b.classList.remove('active'));
    this.classList.add('active');
    AppState.currentColor = this.dataset.couleur;
  }));
  
  document.getElementById('color-picker')?.addEventListener('change', function() {
    AppState.currentColor = this.value;
    document.querySelectorAll('.btn-couleur').forEach(b => b.classList.remove('active'));
  });
  
  document.getElementById('brush-size')?.addEventListener('input', function() {
    AppState.currentSize = parseInt(this.value);
    document.getElementById('taille-display').textContent = this.value;
  });
  
  document.getElementById('btn-sauvegarder-dessin')?.addEventListener('click', sauvegarderDessin);
  document.getElementById('btn-telecharger-dessin')?.addEventListener('click', telechargerDessin);
  document.getElementById('btn-effacer-canvas')?.addEventListener('click', effacerCanvas);
  
  document.querySelectorAll('.modal-overlay, .btn-fermer-modal, .btn-annuler-modal').forEach(el => el.addEventListener('click', function() {
    fermerModal(this.closest('.modal').id);
  }));
  
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && AppState.modalOuverte) fermerModal(AppState.modalOuverte);
  });
}

function initialiserLecteurAudio() {
  AppState.audioPlayer = document.getElementById('audio-player');
  if (AppState.audioPlayer) {
    AppState.audioPlayer.addEventListener('ended', () => {
      if (AppState.currentTrackIndex < PLAYLIST.length - 1) {
        jouerPiste(AppState.currentTrackIndex + 1);
      }
    });
  }
}

function afficherPlaylist() {
  const container = document.getElementById('playlist');
  if (!container) return;
  container.innerHTML = '';
  PLAYLIST.forEach((piste, index) => {
    const carte = document.createElement('article');
    carte.className = 'carte-chanson';
    carte.onclick = () => jouerPiste(index);
    carte.innerHTML = `
      <div class="header-carte-chanson">
        <div class="numero-track">
          <span class="icone">🎵</span>
          <span>Track #${index + 1}</span>
        </div>
      </div>
      <div class="corps-carte-chanson">
        <h3 class="titre-chanson">
          <span class="icone">🎤</span>
          <span>${piste.titre}</span>
        </h3>
        <div class="pensee-chanson">
          <span class="icone">💭</span>
          <p class="texte-pensee">${piste.pensee}</p>
        </div>
      </div>
    `;
    container.appendChild(carte);
  });
}

function jouerPiste(index) {
  if (!AppState.audioPlayer) return;
  const piste = PLAYLIST[index];
  AppState.currentTrackIndex = index;
  AppState.audioPlayer.src = piste.fichier;
  AppState.audioPlayer.play().catch(() => {
    afficherNotification('Fichier audio non trouvé', 'error');
  });
  document.getElementById('titre-piste-actuelle').textContent = piste.titre;
  document.getElementById('pensee-piste-actuelle').textContent = piste.pensee;
  document.querySelectorAll('.carte-chanson').forEach((c, i) => c.classList.toggle('playing', i === index));
}

// ============= SUPABASE FUNCTIONS =============

async function chargerDonneesSupabase() {
  try {
    // Charger messages
    const { data: messages, error: msgError } = await window.supabase
      .from(TABLE_MESSAGES)
      .select('*')
      .order('created_at', { ascending: false });
    
    if (msgError) throw msgError;
    afficherMessages(messages || []);
    
    // S'abonner aux changements en temps réel
    window.supabase
      .channel('messages-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: TABLE_MESSAGES }, payload => {
        console.log('Change messages:', payload);
        chargerMessages();
      })
      .subscribe();
    
    // Charger dessins
    chargerDessins();
    window.supabase
      .channel('dessins-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: TABLE_DESSINS }, () => chargerDessins())
      .subscribe();
    
    // Charger désirs
    chargerDesirs();
    window.supabase
      .channel('desirs-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: TABLE_DESIRS }, () => chargerDesirs())
      .subscribe();
    
    // Charger photos
    chargerPhotos('recto');
    chargerPhotos('verso');
    window.supabase
      .channel('photos-recto-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: TABLE_PHOTOS_RECTO }, () => chargerPhotos('recto'))
      .subscribe();
    window.supabase
      .channel('photos-verso-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: TABLE_PHOTOS_VERSO }, () => chargerPhotos('verso'))
      .subscribe();
    
  } catch (e) {
    console.error('Erreur Supabase:', e);
    afficherNotification('Erreur de connexion Supabase. Vérifiez votre configuration.', 'error');
  }
}

async function chargerMessages() {
  const { data, error } = await window.supabase
    .from(TABLE_MESSAGES)
    .select('*')
    .order('created_at', { ascending: false });
  if (!error) afficherMessages(data || []);
}

async function chargerDessins() {
  const { data, error } = await window.supabase
    .from(TABLE_DESSINS)
    .select('*')
    .order('created_at', { ascending: false });
  if (!error) afficherDessins(data || []);
}

async function chargerDesirs() {
  const { data, error } = await window.supabase
    .from(TABLE_DESIRS)
    .select('*')
    .order('created_at', { ascending: false });
  if (!error) afficherDesirs(data || []);
}

async function chargerPhotos(type) {
  const table = type === 'recto' ? TABLE_PHOTOS_RECTO : TABLE_PHOTOS_VERSO;
  const { data, error } = await window.supabase
    .from(table)
    .select('*')
    .order('date_souvenir', { ascending: false });
  if (!error) afficherPhotos(type, data || []);
}

// ============= FONCTIONS MESSAGES =============

function ouvrirModalNouveauMessage() {
  AppState.modeEdition = false;
  document.getElementById('titre-modal-message').textContent = 'Nouveau Message';
  document.getElementById('form-message').reset();
  document.getElementById('count-chars').textContent = '0';
  ouvrirModal('modal-message');
}

async function sauvegarderMessage() {
  const texte = document.getElementById('input-message').value.trim();
  const tagsInput = document.getElementById('input-tags').value.trim();
  const tags = tagsInput ? tagsInput.split(',').map(t => t.trim()).filter(t => t) : [];
  const humeur = document.querySelector('input[name="humeur"]:checked')?.value || 'heureux';
  
  if (!texte) return afficherNotification('Veuillez écrire un message', 'error');
  
  try {
    const { error } = await window.supabase
      .from(TABLE_MESSAGES)
      .insert([{
        texte,
        tags,
        humeur,
        likes: 0,
        created_at: new Date().toISOString()
      }]);
    
    if (error) throw error;
    fermerModal('modal-message');
    afficherNotification('❤️ Message sauvegardé !', 'success');
  } catch (e) {
    console.error('Erreur:', e);
    afficherNotification('Erreur de sauvegarde', 'error');
  }
}

function afficherMessages(messages) {
  const liste = document.getElementById('liste-messages');
  const zoneVide = document.getElementById('messages-vide');
  if (!liste) return;
  
  if (messages.length === 0) {
    liste.innerHTML = '';
    if (zoneVide) zoneVide.style.display = 'block';
    return;
  }
  
  if (zoneVide) zoneVide.style.display = 'none';
  liste.innerHTML = '';
  
  messages.forEach((msg, idx) => {
    const carte = document.createElement('article');
    carte.className = 'carte-message';
    const dateCreation = new Date(msg.created_at).toLocaleDateString('fr-FR');
    const tagsHtml = msg.tags && msg.tags.length > 0 
      ? '<div class="tags-message">' + msg.tags.map(t => `<span class="tag">${t}</span>`).join('') + '</div>' 
      : '';
    
    carte.innerHTML = `
      <div class="header-carte">
        <span class="numero-message">📝 Message #${messages.length - idx}</span>
      </div>
      <div class="corps-carte">
        <div class="texte-message">${msg.texte}</div>
        ${tagsHtml}
      </div>
      <div class="footer-carte">
        <div class="meta-info">
          <span>⏰ ${dateCreation}</span>
          <span>❤️ ${msg.likes || 0} J'aime</span>
        </div>
        <div class="actions-message">
          <button class="btn-action" onclick="likerMessage('${msg.id}')">
            <span>❤️</span> J'aime
          </button>
          <button class="btn-action" onclick="supprimerMessage('${msg.id}')">
            <span>🗑️</span> Suppr
          </button>
        </div>
      </div>
    `;
    liste.appendChild(carte);
  });
}

window.likerMessage = async function(id) {
  try {
    const { data: msg, error: fetchError } = await window.supabase
      .from(TABLE_MESSAGES)
      .select('likes')
      .eq('id', id)
      .single();
    
    if (fetchError) throw fetchError;
    
    const { error: updateError } = await window.supabase
      .from(TABLE_MESSAGES)
      .update({ likes: (msg.likes || 0) + 1 })
      .eq('id', id);
    
    if (updateError) throw updateError;
  } catch (e) {
    console.error('Erreur:', e);
    afficherNotification('Erreur', 'error');
  }
};

window.supprimerMessage = async function(id) {
  if (!confirm('Supprimer ce message ?')) return;
  try {
    const { error } = await window.supabase
      .from(TABLE_MESSAGES)
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    afficherNotification('Message supprimé', 'info');
  } catch (e) {
    console.error('Erreur:', e);
    afficherNotification('Erreur', 'error');
  }
};

// ============= FONCTIONS CANVAS =============

function demarrerDessin(e) {
  AppState.isDrawing = true;
  const coords = getMousePos(e);
  AppState.ctx.beginPath();
  AppState.ctx.moveTo(coords.x, coords.y);
}

function dessiner(e) {
  if (!AppState.isDrawing) return;
  const coords = getMousePos(e);
  
  if (AppState.currentTool === 'brush' || AppState.currentTool === 'pencil') {
    AppState.ctx.strokeStyle = AppState.currentColor;
    AppState.ctx.lineWidth = AppState.currentSize;
    AppState.ctx.lineTo(coords.x, coords.y);
    AppState.ctx.stroke();
  } else if (AppState.currentTool === 'spray') {
    AppState.ctx.fillStyle = AppState.currentColor;
    for (let i = 0; i < 50; i++) {
      const offsetX = (Math.random() - 0.5) * AppState.currentSize * 2;
      const offsetY = (Math.random() - 0.5) * AppState.currentSize * 2;
      AppState.ctx.fillRect(coords.x + offsetX, coords.y + offsetY, 1, 1);
    }
  } else if (AppState.currentTool === 'eraser') {
    AppState.ctx.clearRect(
      coords.x - AppState.currentSize / 2, 
      coords.y - AppState.currentSize / 2, 
      AppState.currentSize, 
      AppState.currentSize
    );
  }
}

function arreterDessin() {
  AppState.isDrawing = false;
}

function getMousePos(e) {
  const rect = AppState.canvas.getBoundingClientRect();
  const scaleX = AppState.canvas.width / rect.width;
  const scaleY = AppState.canvas.height / rect.height;
  return { 
    x: (e.clientX - rect.left) * scaleX, 
    y: (e.clientY - rect.top) * scaleY 
  };
}

async function sauvegarderDessin() {
  const dataURL = AppState.canvas.toDataURL('image/png');
  try {
    const { error } = await window.supabase
      .from(TABLE_DESSINS)
      .insert([{
        data_url: dataURL,
        created_at: new Date().toISOString()
      }]);
    
    if (error) throw error;
    afficherNotification('❤️ Dessin sauvegardé !', 'success');
  } catch (e) {
    console.error('Erreur:', e);
    afficherNotification('Erreur', 'error');
  }
}

function telechargerDessin() {
  const dataURL = AppState.canvas.toDataURL('image/png');
  const link = document.createElement('a');
  link.download = 'dessin_valentine_' + Date.now() + '.png';
  link.href = dataURL;
  link.click();
  afficherNotification('Dessin téléchargé !', 'success');
}

function effacerCanvas() {
  if (!confirm('Effacer tout ?')) return;
  AppState.ctx.fillStyle = 'white';
  AppState.ctx.fillRect(0, 0, AppState.canvas.width, AppState.canvas.height);
}

function afficherDessins(dessins) {
  const liste = document.getElementById('liste-dessins-sauvegardes');
  const zoneVide = document.getElementById('dessins-vide');
  if (!liste) return;
  
  if (dessins.length === 0) {
    liste.innerHTML = '';
    if (zoneVide) zoneVide.style.display = 'block';
    return;
  }
  
  if (zoneVide) zoneVide.style.display = 'none';
  liste.innerHTML = '';
  
  dessins.forEach(d => {
    const carte = document.createElement('div');
    carte.className = 'carte-dessin-miniature';
    const dateCreation = new Date(d.created_at).toLocaleDateString();
    carte.innerHTML = `
      <div class="preview-dessin">
        <img src="${d.data_url}" class="image-dessin">
      </div>
      <div class="info-dessin">
        <p class="date-dessin">${dateCreation}</p>
      </div>
      <div class="actions-dessin">
        <button class="btn-mini" onclick="supprimerDessin('${d.id}')">🗑️</button>
      </div>
    `;
    liste.appendChild(carte);
  });
}

window.supprimerDessin = async function(id) {
  if (!confirm('Supprimer ?')) return;
  try {
    const { error } = await window.supabase
      .from(TABLE_DESSINS)
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    afficherNotification('Supprimé', 'info');
  } catch (e) {
    console.error('Erreur:', e);
    afficherNotification('Erreur', 'error');
  }
};

// ============= FONCTIONS DÉSIRS =============

function ouvrirModalNouveauDesir() {
  AppState.modeEdition = false;
  document.getElementById('titre-modal-desir').textContent = 'Nouveau Désir';
  document.getElementById('form-desir').reset();
  ouvrirModal('modal-desir');
}

async function sauvegarderDesir() {
  const titre = document.getElementById('input-titre-desir').value.trim();
  const description = document.getElementById('input-description-desir').value.trim();
  const priorite = parseInt(document.querySelector('input[name="priorite"]:checked')?.value || 3);
  const categorie = document.getElementById('select-categorie-desir').value;
  
  if (!titre || !description) return afficherNotification('Remplissez tous les champs', 'error');
  
  try {
    const { error } = await window.supabase
      .from(TABLE_DESIRS)
      .insert([{
        titre,
        description,
        priorite,
        categorie,
        realise: false,
        created_at: new Date().toISOString()
      }]);
    
    if (error) throw error;
    fermerModal('modal-desir');
    afficherNotification('❤️ Désir sauvegardé !', 'success');
  } catch (e) {
    console.error('Erreur:', e);
    afficherNotification('Erreur', 'error');
  }
}

function afficherDesirs(desirs) {
  const liste = document.getElementById('liste-desirs');
  const zoneVide = document.getElementById('desirs-vide');
  if (!liste) return;
  
  const categorie = document.getElementById('filtre-categorie')?.value || 'tous';
  const statut = document.getElementById('filtre-statut')?.value || 'tous';
  
  let desirsFiltre = desirs;
  if (categorie !== 'tous') desirsFiltre = desirsFiltre.filter(d => d.categorie === categorie);
  if (statut === 'en-attente') desirsFiltre = desirsFiltre.filter(d => !d.realise);
  else if (statut === 'realise') desirsFiltre = desirsFiltre.filter(d => d.realise);
  
  if (desirsFiltre.length === 0) {
    liste.innerHTML = '';
    if (zoneVide) zoneVide.style.display = 'block';
    return;
  }
  
  if (zoneVide) zoneVide.style.display = 'none';
  liste.innerHTML = '';
  
  desirsFiltre.forEach(d => {
    const carte = document.createElement('article');
    carte.className = 'carte-desir' + (d.realise ? ' realise' : '');
    const etoiles = '★'.repeat(d.priorite) + '☆'.repeat(5 - d.priorite);
    
    carte.innerHTML = `
      <div class="header-carte-desir">
        <div class="titre-desir-groupe">
          <span class="icone-desir">🎁</span>
          <h3 class="titre-desir">${d.titre}</h3>
        </div>
        <label class="checkbox-realise">
          <input type="checkbox" class="input-realise" ${d.realise ? 'checked' : ''} 
            onchange="toggleRealiseDesir('${d.id}')">
        </label>
      </div>
      <div class="corps-carte-desir">
        <p class="description-desir">${d.description}</p>
        <div class="meta-desir">
          <div class="priorite-desir">
            <span>💎 Priorité:</span>
            <div class="etoiles-priorite">${etoiles}</div>
          </div>
        </div>
      </div>
      <div class="footer-carte-desir">
        <button class="btn-action-desir" onclick="supprimerDesir('${d.id}')">🗑️</button>
      </div>
    `;
    liste.appendChild(carte);
  });
  
  // Statistiques
  const total = desirs.length;
  const realises = desirs.filter(d => d.realise).length;
  document.getElementById('stat-total').textContent = total;
  document.getElementById('stat-realises').textContent = realises;
  document.getElementById('stat-en-attente').textContent = total - realises;
}

window.toggleRealiseDesir = async function(id) {
  try {
    const { data: desir, error: fetchError } = await window.supabase
      .from(TABLE_DESIRS)
      .select('realise')
      .eq('id', id)
      .single();
    
    if (fetchError) throw fetchError;
    
    const { error: updateError } = await window.supabase
      .from(TABLE_DESIRS)
      .update({ realise: !desir.realise })
      .eq('id', id);
    
    if (updateError) throw updateError;
  } catch (e) {
    console.error('Erreur:', e);
    afficherNotification('Erreur', 'error');
  }
};

window.supprimerDesir = async function(id) {
  if (!confirm('Supprimer ?')) return;
  try {
    const { error } = await window.supabase
      .from(TABLE_DESIRS)
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    afficherNotification('Supprimé', 'info');
  } catch (e) {
    console.error('Erreur:', e);
    afficherNotification('Erreur', 'error');
  }
};

async function filtrerDesirs() {
  await chargerDesirs();
}

// ============= FONCTIONS GALERIE =============

window.changerOngletGalerie = function(onglet) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-contenu').forEach(c => c.classList.remove('active'));
  document.querySelector('.tab-btn[data-tab="' + onglet + '"]')?.classList.add('active');
  document.getElementById('tab-' + onglet)?.classList.add('active');
  AppState.ongletGalerieActif = onglet;
};

function ajouterPhotos(event, type) {
  const files = event.target.files;
  if (!files || files.length === 0) return;
  
  Array.from(files).forEach(file => {
    if (!file.type.startsWith('image/')) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
      AppState.itemEnEdition = {dataURL: e.target.result, type: type};
      document.getElementById('preview-modal-photo').src = e.target.result;
      document.getElementById('input-legende-photo').value = '';
      document.getElementById('input-date-photo').value = new Date().toISOString().split('T')[0];
      ouvrirModal('modal-photo');
    };
    reader.readAsDataURL(file);
  });
  
  event.target.value = '';
}

async function sauvegarderInfoPhoto() {
  if (!AppState.itemEnEdition) return;
  
  const legende = document.getElementById('input-legende-photo').value.trim();
  const dateSouvenir = document.getElementById('input-date-photo').value;
  
  if (!legende) return afficherNotification('Ajoutez une légende', 'error');
  
  try {
    const tableName = AppState.itemEnEdition.type === 'recto' ? TABLE_PHOTOS_RECTO : TABLE_PHOTOS_VERSO;
    
    const { error } = await window.supabase
      .from(tableName)
      .insert([{
        data_url: AppState.itemEnEdition.dataURL,
        legende,
        date_souvenir: dateSouvenir,
        created_at: new Date().toISOString()
      }]);
    
    if (error) throw error;
    
    fermerModal('modal-photo');
    AppState.itemEnEdition = null;
    afficherNotification('❤️ Photo ajoutée !', 'success');
  } catch (e) {
    console.error('Erreur:', e);
    afficherNotification('Erreur', 'error');
  }
}

function afficherPhotos(type, photos) {
  const grille = document.getElementById('galerie-' + type);
  const zoneVide = document.getElementById(type + '-vide');
  if (!grille) return;
  
  if (photos.length === 0) {
    grille.innerHTML = '';
    if (zoneVide) zoneVide.style.display = 'block';
    return;
  }
  
  if (zoneVide) zoneVide.style.display = 'none';
  grille.innerHTML = '';
  
  photos.forEach(p => {
    const carte = document.createElement('div');
    carte.className = 'carte-photo';
    const dateSouvenir = new Date(p.date_souvenir).toLocaleDateString();
    
    carte.innerHTML = `
      <div class="conteneur-image" onclick="ouvrirLightbox('${p.id}', '${type}')">
        <img src="${p.data_url}" alt="${p.legende}" class="image-photo">
        <div class="overlay-photo">
          <span class="icone-zoom">🔍</span>
        </div>
      </div>
      <div class="info-photo">
        <p class="date-photo">${dateSouvenir}</p>
        <p class="legende-photo">${p.legende}</p>
      </div>
      <div class="actions-photo">
        <button class="btn-mini" onclick="supprimerPhoto('${p.id}', '${type}')">🗑️</button>
      </div>
    `;
    grille.appendChild(carte);
  });
}

window.supprimerPhoto = async function(id, type) {
  if (!confirm('Supprimer ?')) return;
  try {
    const tableName = type === 'recto' ? TABLE_PHOTOS_RECTO : TABLE_PHOTOS_VERSO;
    
    const { error } = await window.supabase
      .from(tableName)
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    afficherNotification('Supprimé', 'info');
  } catch (e) {
    console.error('Erreur:', e);
    afficherNotification('Erreur', 'error');
  }
};

window.ouvrirLightbox = function(id, type) {
  console.log('Lightbox:', id, type);
};

// ============= UTILITAIRES =============

function ouvrirModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('active');
    AppState.modalOuverte = modalId;
  }
}

function fermerModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('active');
    AppState.modalOuverte = null;
    const form = modal.querySelector('form');
    if (form) form.reset();
  }
}

function afficherNotification(texte, type = 'info') {
  const notif = document.createElement('div');
  notif.textContent = texte;
  Object.assign(notif.style, {
    position: 'fixed',
    top: '20px',
    right: '20px',
    background: type === 'success' ? '#27ae60' : type === 'error' ? '#e74c3c' : '#dc143c',
    color: 'white',
    padding: '15px 25px',
    borderRadius: '10px',
    boxShadow: '0 5px 20px rgba(0,0,0,0.3)',
    zIndex: '10000',
    maxWidth: '300px'
  });
  document.body.appendChild(notif);
  setTimeout(() => notif.remove(), 3000);
}

window.scrollToSection = function(sectionId) {
  document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
};

function demarrerAnimations() {
  const container = document.getElementById('particules-coeurs');
  if (!container) return;
  
  setInterval(() => {
    if (container.children.length < 20) {
      const coeur = document.createElement('div');
      coeur.textContent = ['❤️', '💕', '💖', '💗'][Math.floor(Math.random() * 4)];
      coeur.style.cssText = `
        position: absolute;
        bottom: -50px;
        left: ${Math.random() * 100}%;
        font-size: ${10 + Math.random() * 20}px;
        animation: monterCoeur ${5 + Math.random() * 5}s linear forwards;
        pointer-events: none;
        opacity: 0.7;
      `;
      container.appendChild(coeur);
      coeur.addEventListener('animationend', () => coeur.remove());
    }
  }, 800);
  
  if (!document.getElementById('coeur-animation')) {
    const style = document.createElement('style');
    style.id = 'coeur-animation';
    style.textContent = `
      @keyframes monterCoeur {
        0% { bottom: -50px; opacity: 0; transform: translateX(0); }
        10% { opacity: 0.7; }
        90% { opacity: 0.3; }
        100% { bottom: 110%; opacity: 0; transform: translateX(${-50 + Math.random() * 100}px); }
      }
    `;
    document.head.appendChild(style);
  }
}

// Fonction spécifique au scroll horizontal
window.scrollToNextSection = function(sectionIndex) {
  const sections = document.querySelectorAll('.section-horizontal');
  if (sections[sectionIndex]) {
    sections[sectionIndex].scrollIntoView({ 
      behavior: 'smooth', 
      block: 'nearest', 
      inline: 'start' 
    });
  }
};

// Mise à jour de la navigation au scroll
const container = document.querySelector('.horizontal-scroll-container');
if (container) {
  container.addEventListener('scroll', () => {
    const sections = document.querySelectorAll('.section-horizontal');
    const scrollLeft = container.scrollLeft;
    const sectionWidth = container.offsetWidth;
    const currentSection = Math.round(scrollLeft / sectionWidth);
    
    document.querySelectorAll('.nav-dot').forEach((dot, index) => {
      dot.classList.toggle('active', index === currentSection);
    });
  });
}
