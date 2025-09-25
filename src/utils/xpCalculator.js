import xpDataManager from './xpDataManager.js';

class XPCalculator {
    /**
     * Calcule l'XP nécessaire pour atteindre un niveau donné
     */
    static async xpForLevel(level) {
        const config = await xpDataManager.getLevelConfig();
        const { mode, levelBase, levelStep, customThresholds } = config.levelThresholds;

        if (level <= 0) return 0;

        if (mode === 'custom' && customThresholds.length > 0) {
            // Mode personnalisé avec seuils définis
            if (level <= customThresholds.length) {
                return customThresholds[level - 1];
            } else {
                // Si le niveau dépasse les seuils personnalisés, utiliser le mode arithmétique
                const lastThreshold = customThresholds[customThresholds.length - 1];
                const remainingLevels = level - customThresholds.length;
                return lastThreshold + (remainingLevels * levelStep);
            }
        } else {
            // Mode arithmétique : levelBase + (level - 1) * levelStep
            return levelBase + ((level - 1) * levelStep);
        }
    }

    /**
     * Détermine le niveau basé sur l'XP total
     */
    static async levelFromXP(totalXp) {
        if (totalXp < 0) return 0;

        const config = await xpDataManager.getLevelConfig();
        const { mode, customThresholds } = config.levelThresholds;

        if (mode === 'custom' && customThresholds.length > 0) {
            // Mode personnalisé
            for (let i = 0; i < customThresholds.length; i++) {
                if (totalXp < customThresholds[i]) {
                    return i; // Niveau 0-based, donc i correspond au niveau
                }
            }
            
            // Si l'XP dépasse tous les seuils personnalisés
            const lastThreshold = customThresholds[customThresholds.length - 1];
            const remainingXp = totalXp - lastThreshold;
            const { levelStep } = config.levelThresholds;
            const additionalLevels = Math.floor(remainingXp / levelStep);
            return customThresholds.length + additionalLevels;
        } else {
            // Mode arithmétique
            const { levelBase, levelStep } = config.levelThresholds;
            
            // Résoudre l'équation : totalXp = levelBase + (level - 1) * levelStep
            // level = (totalXp - levelBase) / levelStep + 1
            if (totalXp < levelBase) return 0;
            
            return Math.floor((totalXp - levelBase) / levelStep) + 1;
        }
    }

    /**
     * Calcule l'XP nécessaire pour le prochain niveau
     */
    static async xpForNextLevel(currentXp) {
        const currentLevel = await this.levelFromXP(currentXp);
        const nextLevel = currentLevel + 1;
        return await this.xpForLevel(nextLevel);
    }

    /**
     * Calcule le progrès vers le prochain niveau (0-1)
     */
    static async progressToNextLevel(currentXp) {
        const currentLevel = await this.levelFromXP(currentXp);
        const currentLevelXp = await this.xpForLevel(currentLevel);
        const nextLevelXp = await this.xpForLevel(currentLevel + 1);
        
        if (nextLevelXp === currentLevelXp) return 1; // Niveau max atteint
        
        const progressXp = currentXp - currentLevelXp;
        const requiredXp = nextLevelXp - currentLevelXp;
        
        return Math.min(progressXp / requiredXp, 1);
    }

    /**
     * Retourne des informations complètes sur le niveau d'un utilisateur
     */
    static async getUserLevelInfo(totalXp) {
        const currentLevel = await this.levelFromXP(totalXp);
        const currentLevelXp = await this.xpForLevel(currentLevel);
        const nextLevelXp = await this.xpForLevel(currentLevel + 1);
        const progress = await this.progressToNextLevel(totalXp);
        
        return {
            level: currentLevel,
            totalXp: totalXp,
            currentLevelXp: currentLevelXp,
            nextLevelXp: nextLevelXp,
            xpInCurrentLevel: totalXp - currentLevelXp,
            xpToNextLevel: nextLevelXp - totalXp,
            progress: progress
        };
    }

    /**
     * Vérifie si un utilisateur a gagné un niveau après avoir reçu de l'XP
     */
    static async checkLevelUp(oldXp, newXp) {
        const oldLevel = await this.levelFromXP(oldXp);
        const newLevel = await this.levelFromXP(newXp);
        
        if (newLevel > oldLevel) {
            return {
                leveledUp: true,
                oldLevel: oldLevel,
                newLevel: newLevel,
                levelsGained: newLevel - oldLevel
            };
        }
        
        return {
            leveledUp: false,
            oldLevel: oldLevel,
            newLevel: newLevel,
            levelsGained: 0
        };
    }

    /**
     * Génère une barre de progression visuelle
     */
    static generateProgressBar(progress, length = 10) {
        const filled = Math.round(progress * length);
        const empty = length - filled;
        
        const filledChar = '█';
        const emptyChar = '░';
        
        return filledChar.repeat(filled) + emptyChar.repeat(empty);
    }

    /**
     * Formate l'XP avec des séparateurs de milliers
     */
    static formatXP(xp) {
        return xp.toLocaleString('fr-FR');
    }

    /**
     * Valide les seuils personnalisés
     */
    static validateCustomThresholds(thresholds) {
        if (!Array.isArray(thresholds)) return false;
        if (thresholds.length === 0) return true;
        
        // Vérifier que les seuils sont croissants
        for (let i = 1; i < thresholds.length; i++) {
            if (thresholds[i] <= thresholds[i - 1]) {
                return false;
            }
        }
        
        // Vérifier que tous les seuils sont des nombres positifs
        return thresholds.every(threshold => 
            typeof threshold === 'number' && threshold > 0
        );
    }

    /**
     * Génère des seuils arithmétiques pour prévisualisation
     */
    static generateArithmeticThresholds(levelBase, levelStep, maxLevel = 10) {
        const thresholds = [];
        for (let level = 1; level <= maxLevel; level++) {
            thresholds.push(levelBase + ((level - 1) * levelStep));
        }
        return thresholds;
    }
}

export default XPCalculator;