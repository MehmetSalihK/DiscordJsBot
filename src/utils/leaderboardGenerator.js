import { createCanvas, loadImage, registerFont } from 'canvas';
import path from 'path';

class LeaderboardGenerator {
    constructor() {
        this.width = 800;
        this.height = 1200;
        this.padding = 40;
        this.avatarSize = 80;
        this.rankWidth = 60;
        this.xpWidth = 120;
        this.progressBarHeight = 20;
        this.rowHeight = 100;
        this.entriesPerPage = 10;
        
        // Couleurs du thème sombre
        this.colors = {
            background: '#1E1F22',
            card: '#2B2D31',
            text: '#FFFFFF',
            secondaryText: '#B5BAC1',
            accent: '#5865F2',
            progressBackground: '#1E1F22',
            divider: '#3F4248',
            rank1: '#FFD700',
            rank2: '#C0C0C0',
            rank3: '#CD7F32'
        };
        
        // Utiliser les polices système par défaut
        console.log('Utilisation des polices système par défaut');
    }

    /**
     * Génère une image de classement à partir des données fournies
     */
    async generate(leaderboardData, title = 'Classement XP', type = 'global') {
        const canvas = createCanvas(this.width, this.height);
        const ctx = canvas.getContext('2d');

        // Dessiner l'arrière-plan
        this.drawBackground(ctx);

        // Dessiner la carte principale
        this.drawCard(ctx, title, type);

        // Dessiner les entrées du classement
        await this.drawLeaderboardEntries(ctx, leaderboardData);

        // Ajouter un pied de page
        this.drawFooter(ctx);

        return canvas.toBuffer();
    }

    drawBackground(ctx) {
        // Dégradé d'arrière-plan
        const gradient = ctx.createLinearGradient(0, 0, this.width, this.height);
        gradient.addColorStop(0, '#1A1B1E');
        gradient.addColorStop(1, '#2C2F33');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, this.width, this.height);
    }

    drawCard(ctx, title, type) {
        const cardX = this.padding;
        const cardY = this.padding;
        const cardWidth = this.width - (this.padding * 2);
        const headerHeight = 100;

        // Dessiner la carte
        this.roundRect(ctx, cardX, cardY, cardWidth, this.height - (this.padding * 2), 20, this.colors.card);
        
        // Dessiner l'en-tête
        const headerGradient = ctx.createLinearGradient(0, cardY, 0, cardY + headerHeight);
        headerGradient.addColorStop(0, '#5865F2');
        headerGradient.addColorStop(1, '#3B48D8');
        
        this.roundRect(ctx, cardX, cardY, cardWidth, headerHeight, 20, headerGradient);
        
        // Ajouter le titre
        ctx.fillStyle = this.colors.text;
        ctx.font = 'bold 32px Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(title, this.width / 2, cardY + 60);
        
        // Ajouter le type de classement
        ctx.font = '18px Arial, sans-serif';
        ctx.fillStyle = this.colors.secondaryText;
        ctx.fillText(
            type === 'message' ? '💬 Classement des messages' : 
            type === 'voice' ? '🎤 Classement vocal' : '🌟 Classement global', 
            this.width / 2, 
            cardY + 90
        );
    }

    async drawLeaderboardEntries(ctx, entries) {
        const startY = 180;
        const entryHeight = this.rowHeight;
        
        // En-tête des colonnes
        ctx.fillStyle = this.colors.secondaryText;
        ctx.font = 'bold 14px Arial, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('#', this.padding + 30, startY - 10);
        ctx.fillText('Membre', this.padding + 100, startY - 10);
        ctx.textAlign = 'right';
        ctx.fillText('XP', this.width - this.padding - 20, startY - 10);
        
        // Ligne de séparation
        ctx.strokeStyle = this.colors.divider;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(this.padding + 20, startY + 5);
        ctx.lineTo(this.width - this.padding - 20, startY + 5);
        ctx.stroke();
        
        // Dessiner chaque entrée
        for (let i = 0; i < Math.min(entries.length, this.entriesPerPage); i++) {
            const entry = entries[i];
            const y = startY + (i * entryHeight) + 20;
            
            // Couleur du rang
            let rankColor = this.colors.text;
            if (i === 0) rankColor = this.colors.rank1;
            else if (i === 1) rankColor = this.colors.rank2;
            else if (i === 2) rankColor = this.colors.rank3;
            
            // Numéro de rang
            ctx.fillStyle = rankColor;
            ctx.font = 'bold 20px Arial, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(`#${i + 1}`, this.padding + 50, y + 25);
            
            try {
                // Avatar
                const avatar = await loadImage(entry.avatarURL);
                ctx.save();
                this.roundImage(ctx, this.padding + 90, y - 15, this.avatarSize, this.avatarSize);
                ctx.clip();
                ctx.drawImage(avatar, this.padding + 90, y - 15, this.avatarSize, this.avatarSize);
                ctx.restore();
            } catch (error) {
                console.error('Erreur lors du chargement de l\'avatar:', error);
                // Dessiner un avatar par défaut en cas d'erreur
                ctx.fillStyle = '#7289DA';
                ctx.beginPath();
                ctx.arc(this.padding + 90 + (this.avatarSize / 2), y - 15 + (this.avatarSize / 2), this.avatarSize / 2, 0, Math.PI * 2);
                ctx.fill();
                
                ctx.fillStyle = '#FFFFFF';
                ctx.font = 'bold 24px Arial, sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(entry.username[0].toUpperCase(), this.padding + 90 + (this.avatarSize / 2), y + 25);
            }
            
            // Nom d'utilisateur
            ctx.fillStyle = this.colors.text;
            ctx.font = '18px Arial, sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText(entry.username, this.padding + 190, y + 15);
            
            // Niveau et XP
            ctx.font = '14px Arial, sans-serif';
            ctx.fillStyle = this.colors.secondaryText;
            ctx.fillText(`Niveau ${entry.level} • ${entry.xp.toLocaleString('fr-FR')} XP`, this.padding + 190, y + 40);
            
            // Barre de progression
            this.drawProgressBar(
                ctx, 
                this.padding + 190, 
                y + 50, 
                this.width - this.padding - 290, 
                8, 
                entry.progress,
                this.colors.accent
            );
            
            // Séparateur
            if (i < Math.min(entries.length - 1, this.entriesPerPage - 1)) {
                ctx.strokeStyle = this.colors.divider;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(this.padding + 90, y + 70);
                ctx.lineTo(this.width - this.padding - 20, y + 70);
                ctx.stroke();
            }
        }
    }

    drawProgressBar(ctx, x, y, width, height, progress, color) {
        // Arrière-plan de la barre
        this.roundRect(ctx, x, y, width, height, height / 2, this.colors.progressBackground);
        
        // Avancement
        const progressWidth = Math.max(10, width * progress);
        this.roundRect(ctx, x, y, progressWidth, height, height / 2, color);
    }

    drawFooter(ctx) {
        const footerY = this.height - this.padding - 30;
        
        // Ligne de séparation
        ctx.strokeStyle = this.colors.divider;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(this.padding + 20, footerY - 30);
        ctx.lineTo(this.width - this.padding - 20, footerY - 30);
        ctx.stroke();
        
        // Texte du pied de page
        ctx.fillStyle = this.colors.secondaryText;
        ctx.font = '12px Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Classement mis à jour à', this.width / 2, footerY);
        
        // Date et heure
        const now = new Date();
        const options = { 
            day: '2-digit', 
            month: '2-digit', 
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        };
        const dateString = now.toLocaleDateString('fr-FR', options);
        
        ctx.font = 'bold 12px Arial, sans-serif';
        ctx.fillText(dateString, this.width / 2, footerY + 15);
    }

    // Fonctions utilitaires
    roundRect(ctx, x, y, width, height, radius, fill, stroke = false) {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
        
        if (fill) {
            ctx.fillStyle = fill;
            ctx.fill();
        }
        
        if (stroke) {
            ctx.stroke();
        }
    }

    roundImage(ctx, x, y, width, height, radius = 10) {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
    }
}

export { LeaderboardGenerator };

