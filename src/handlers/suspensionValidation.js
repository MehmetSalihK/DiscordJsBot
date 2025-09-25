const { EmbedBuilder } = require('discord.js');
const { getGuildConfig } = require('./suspensionRoles');
const { getSuspensionInfo } = require('./suspensionTimers');

// Validation des permissions pour les actions de suspension
async function validateSuspensionPermissions(interaction, targetMember, action = 'suspend') {
    const errors = [];
    const warnings = [];

    try {
        // Vérifier les permissions de base du bot
        const botMember = interaction.guild.members.me;
        if (!botMember.permissions.has('ManageRoles')) {
            errors.push('Le bot n\'a pas la permission "Gérer les rôles"');
        }

        if (!botMember.permissions.has('ModerateMembers')) {
            warnings.push('Le bot n\'a pas la permission "Modérer les membres" (recommandée)');
        }

        // Vérifier les permissions du modérateur
        if (!interaction.member.permissions.has('ModerateMembers') && 
            !interaction.member.permissions.has('ManageRoles')) {
            errors.push('Vous n\'avez pas les permissions nécessaires pour cette action');
        }

        // Vérifier la hiérarchie des rôles
        if (targetMember) {
            const moderatorHighestRole = interaction.member.roles.highest;
            const targetHighestRole = targetMember.roles.highest;
            const botHighestRole = botMember.roles.highest;

            if (targetHighestRole.position >= moderatorHighestRole.position) {
                errors.push('Vous ne pouvez pas modérer cet utilisateur (rôle supérieur ou égal)');
            }

            if (targetHighestRole.position >= botHighestRole.position) {
                errors.push('Le bot ne peut pas modérer cet utilisateur (rôle supérieur ou égal)');
            }

            // Vérifier si l'utilisateur est un bot
            if (targetMember.user.bot) {
                warnings.push('Attention: Vous tentez de suspendre un bot');
            }

            // Vérifier si l'utilisateur est le propriétaire du serveur
            if (targetMember.id === interaction.guild.ownerId) {
                errors.push('Impossible de suspendre le propriétaire du serveur');
            }

            // Vérifier si l'utilisateur tente de se suspendre lui-même
            if (targetMember.id === interaction.user.id) {
                errors.push('Vous ne pouvez pas vous suspendre vous-même');
            }
        }

        return { errors, warnings, isValid: errors.length === 0 };

    } catch (error) {
        // console.error('Erreur lors de la validation des permissions:', error);
        return { 
            errors: ['Erreur lors de la validation des permissions'], 
            warnings: [], 
            isValid: false 
        };
    }
}

// Validation de la configuration du serveur
async function validateGuildConfiguration(guildId) {
    const errors = [];
    const warnings = [];

    try {
        const config = await getGuildConfig(guildId);

        // Vérifier que les rôles de suspension sont configurés
        for (let level = 1; level <= 3; level++) {
            const roleId = config.roles[`level${level}`];
            if (!roleId) {
                errors.push(`Rôle de suspension niveau ${level} non configuré`);
            }
        }

        // Vérifier les durées par défaut
        for (let level = 1; level <= 3; level++) {
            const duration = config.durations[`level${level}`];
            if (!duration || duration <= 0) {
                warnings.push(`Durée par défaut pour le niveau ${level} non configurée`);
            }
        }

        // Vérifier le canal de logs
        if (!config.logChannel) {
            warnings.push('Canal de logs non configuré');
        }

        return { errors, warnings, isValid: errors.length === 0 };

    } catch (error) {
        // console.error('Erreur lors de la validation de la configuration:', error);
        return { 
            errors: ['Erreur lors de la validation de la configuration'], 
            warnings: [], 
            isValid: false 
        };
    }
}

// Validation des données d'entrée
function validateSuspensionInput(userInput, reasonInput, durationInput = '') {
    const errors = [];
    const warnings = [];

    // Validation de l'utilisateur
    if (!userInput || userInput.trim() === '') {
        errors.push('L\'utilisateur est requis');
    } else {
        const userId = userInput.replace(/[<@!>]/g, '');
        if (!/^\d{17,19}$/.test(userId)) {
            errors.push('Format d\'ID utilisateur invalide');
        }
    }

    // Validation de la raison
    if (!reasonInput || reasonInput.trim() === '') {
        errors.push('La raison est requise');
    } else if (reasonInput.length > 500) {
        errors.push('La raison ne peut pas dépasser 500 caractères');
    } else if (reasonInput.length < 5) {
        warnings.push('Raison très courte (moins de 5 caractères)');
    }

    // Validation de la durée (si fournie)
    if (durationInput && durationInput.trim() !== '') {
        const duration = parseDuration(durationInput);
        if (duration <= 0) {
            errors.push('Format de durée invalide');
        } else if (duration > 30 * 24 * 60 * 60 * 1000) { // 30 jours
            warnings.push('Durée très longue (plus de 30 jours)');
        } else if (duration < 60 * 1000) { // 1 minute
            warnings.push('Durée très courte (moins d\'1 minute)');
        }
    }

    return { errors, warnings, isValid: errors.length === 0 };
}

// Validation avant l'annulation d'une suspension
async function validateSuspensionCancellation(guildId, userId) {
    const errors = [];
    const warnings = [];

    try {
        // Vérifier qu'il y a une suspension active
        const suspensionInfo = await getSuspensionInfo(guildId, userId);
        if (!suspensionInfo) {
            errors.push('Aucune suspension active trouvée pour cet utilisateur');
        } else {
            // Vérifier le temps restant
            const timeLeft = suspensionInfo.endTime - Date.now();
            if (timeLeft < 60 * 1000) { // Moins d'1 minute
                warnings.push('La suspension se termine dans moins d\'1 minute');
            }
        }

        return { errors, warnings, isValid: errors.length === 0, suspensionInfo };

    } catch (error) {
        // console.error('Erreur lors de la validation de l\'annulation:', error);
        return { 
            errors: ['Erreur lors de la validation de l\'annulation'], 
            warnings: [], 
            isValid: false 
        };
    }
}

// Créer un embed d'erreur formaté
function createErrorEmbed(title, errors, warnings = []) {
    const embed = new EmbedBuilder()
        .setTitle(`❌ ${title}`)
        .setColor('#e74c3c')
        .setTimestamp();

    if (errors.length > 0) {
        embed.addFields({
            name: '🚫 Erreurs',
            value: errors.map(error => `• ${error}`).join('\n'),
            inline: false
        });
    }

    if (warnings.length > 0) {
        embed.addFields({
            name: '⚠️ Avertissements',
            value: warnings.map(warning => `• ${warning}`).join('\n'),
            inline: false
        });
    }

    return embed;
}

// Créer un embed de validation réussie avec avertissements
function createValidationEmbed(title, warnings = []) {
    const embed = new EmbedBuilder()
        .setTitle(`✅ ${title}`)
        .setColor('#f39c12')
        .setTimestamp();

    if (warnings.length > 0) {
        embed.addFields({
            name: '⚠️ Avertissements',
            value: warnings.map(warning => `• ${warning}`).join('\n'),
            inline: false
        });
        embed.setDescription('L\'action peut être effectuée mais veuillez noter les avertissements ci-dessous.');
    } else {
        embed.setDescription('Toutes les validations ont réussi.');
        embed.setColor('#27ae60');
    }

    return embed;
}

// Validation complète avant une action de suspension
async function validateSuspensionAction(interaction, targetMember, userInput, reasonInput, durationInput = '') {
    const validationResults = {
        permissions: await validateSuspensionPermissions(interaction, targetMember),
        configuration: await validateGuildConfiguration(interaction.guild.id),
        input: validateSuspensionInput(userInput, reasonInput, durationInput)
    };

    const allErrors = [
        ...validationResults.permissions.errors,
        ...validationResults.configuration.errors,
        ...validationResults.input.errors
    ];

    const allWarnings = [
        ...validationResults.permissions.warnings,
        ...validationResults.configuration.warnings,
        ...validationResults.input.warnings
    ];

    return {
        isValid: allErrors.length === 0,
        errors: allErrors,
        warnings: allWarnings,
        details: validationResults
    };
}

// Utilitaire pour parser la durée (copié depuis suspensionInterface.js)
function parseDuration(durationStr) {
    if (!durationStr) return 0;
    
    const regex = /(\d+)\s*(s|sec|m|min|h|hour|d|day|w|week)/gi;
    let totalMs = 0;
    let match;

    while ((match = regex.exec(durationStr)) !== null) {
        const value = parseInt(match[1]);
        const unit = match[2].toLowerCase();

        switch (unit) {
            case 's':
            case 'sec':
                totalMs += value * 1000;
                break;
            case 'm':
            case 'min':
                totalMs += value * 60 * 1000;
                break;
            case 'h':
            case 'hour':
                totalMs += value * 60 * 60 * 1000;
                break;
            case 'd':
            case 'day':
                totalMs += value * 24 * 60 * 60 * 1000;
                break;
            case 'w':
            case 'week':
                totalMs += value * 7 * 24 * 60 * 60 * 1000;
                break;
        }
    }

    return totalMs;
}

// Vérification de l'intégrité du système
async function performSystemHealthCheck(guild) {
    const results = {
        roles: { status: 'ok', issues: [] },
        permissions: { status: 'ok', issues: [] },
        configuration: { status: 'ok', issues: [] },
        overall: 'healthy'
    };

    try {
        const config = await getGuildConfig(guild.id);
        const botMember = guild.members.me;

        // Vérifier les rôles
        for (let level = 1; level <= 3; level++) {
            const roleId = config.roles[`level${level}`];
            if (roleId) {
                const role = guild.roles.cache.get(roleId);
                if (!role) {
                    results.roles.issues.push(`Rôle niveau ${level} introuvable (ID: ${roleId})`);
                    results.roles.status = 'warning';
                } else if (role.position >= botMember.roles.highest.position) {
                    results.roles.issues.push(`Rôle niveau ${level} trop élevé dans la hiérarchie`);
                    results.roles.status = 'error';
                }
            } else {
                results.roles.issues.push(`Rôle niveau ${level} non configuré`);
                results.roles.status = 'warning';
            }
        }

        // Vérifier les permissions du bot
        const requiredPermissions = ['ManageRoles', 'SendMessages', 'EmbedLinks'];
        const missingPermissions = requiredPermissions.filter(perm => !botMember.permissions.has(perm));
        
        if (missingPermissions.length > 0) {
            results.permissions.issues.push(`Permissions manquantes: ${missingPermissions.join(', ')}`);
            results.permissions.status = 'error';
        }

        // Vérifier la configuration
        if (!config.logChannel) {
            results.configuration.issues.push('Canal de logs non configuré');
            results.configuration.status = 'warning';
        }

        // Déterminer le statut global
        if (results.roles.status === 'error' || results.permissions.status === 'error') {
            results.overall = 'critical';
        } else if (results.roles.status === 'warning' || results.permissions.status === 'warning' || results.configuration.status === 'warning') {
            results.overall = 'warning';
        }

        return results;

    } catch (error) {
        // console.error('Erreur lors de la vérification de l\'intégrité:', error);
        return {
            roles: { status: 'error', issues: ['Erreur lors de la vérification'] },
            permissions: { status: 'error', issues: ['Erreur lors de la vérification'] },
            configuration: { status: 'error', issues: ['Erreur lors de la vérification'] },
            overall: 'critical'
        };
    }
}

module.exports = {
    validateSuspensionPermissions,
    validateGuildConfiguration,
    validateSuspensionInput,
    validateSuspensionCancellation,
    validateSuspensionAction,
    createErrorEmbed,
    createValidationEmbed,
    performSystemHealthCheck
};