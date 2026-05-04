// === Dashboard ===

const Dashboard = {
    colors: ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6'],

    render() {
        const period = document.getElementById('dashboardPeriod').value;
        let deals = Store.getDeals();

        // Permission filter
        if (!ROLES[Auth.currentUser.role].canViewAll) {
            deals = deals.filter(d => d.advisorId === Auth.currentUser.id || d.createdBy === Auth.currentUser.id);
        }

        // Period filter
        const now = new Date();
        if (period !== 'all') {
            const cutoff = new Date();
            if (period === 'week') cutoff.setDate(now.getDate() - 7);
            else if (period === 'month') cutoff.setMonth(now.getMonth() - 1);
            else if (period === 'quarter') cutoff.setMonth(now.getMonth() - 3);
            deals = deals.filter(d => new Date(d.dealCreated) >= cutoff);
        }

        this.renderKPIs(deals);
        this.renderByStage(deals);
        this.renderByAdvisor(deals);
        this.renderBySource(deals);
        this.renderWeekly();
    },

    renderKPIs(deals) {
        const totalDeals = deals.length;
        const totalAUM = deals.reduce((s, d) => s + (Number(d.estimatedAUM) || 0), 0);
        const closedWon = deals.filter(d => d.dealStage === 'closed-won');
        const closedLost = deals.filter(d => d.dealStage === 'closed-lost');
        const closedTotal = closedWon.length + closedLost.length;
        const winRate = closedTotal > 0 ? Math.round((closedWon.length / closedTotal) * 100) : 0;

        // Avg sales cycle for closed-won deals
        let avgCycle = 0;
        if (closedWon.length > 0) {
            const totalDays = closedWon.reduce((s, d) => {
                return s + daysBetween(d.dealCreated, d.stageChanged);
            }, 0);
            avgCycle = Math.round(totalDays / closedWon.length);
        }

        document.getElementById('dashTotalDeals').textContent = totalDeals;
        document.getElementById('dashTotalAUM').textContent = formatCurrency(totalAUM);
        document.getElementById('dashAvgCycle').textContent = avgCycle + ' days';
        document.getElementById('dashWinRate').textContent = winRate + '%';
    },

    renderByStage(deals) {
        const container = document.getElementById('chartByStage');
        const data = DEAL_STAGES.map(stage => {
            const stageDeals = deals.filter(d => d.dealStage === stage.id);
            return {
                label: stage.label,
                count: stageDeals.length,
                aum: stageDeals.reduce((s, d) => s + (Number(d.estimatedAUM) || 0), 0)
            };
        });

        const maxAUM = Math.max(...data.map(d => d.aum), 1);

        container.innerHTML = `<div class="bar-chart">
            ${data.map((d, i) => `
                <div class="bar-row">
                    <span class="bar-label">${d.label}</span>
                    <div class="bar-track">
                        <div class="bar-fill" style="width:${Math.max(d.aum / maxAUM * 100, d.count > 0 ? 8 : 0)}%;background:${this.colors[i % this.colors.length]}">
                            <span>${d.count}</span>
                        </div>
                    </div>
                    <span class="bar-value">${formatCurrency(d.aum)}</span>
                </div>
            `).join('')}
        </div>`;
    },

    renderByAdvisor(deals) {
        const container = document.getElementById('chartByAdvisor');
        const advisorMap = {};
        deals.forEach(d => {
            const name = d.advisorName || 'Unassigned';
            if (!advisorMap[name]) advisorMap[name] = { count: 0, aum: 0 };
            advisorMap[name].count++;
            advisorMap[name].aum += Number(d.estimatedAUM) || 0;
        });

        const data = Object.entries(advisorMap).sort((a, b) => b[1].aum - a[1].aum);
        const maxAUM = Math.max(...data.map(d => d[1].aum), 1);

        container.innerHTML = `<div class="bar-chart">
            ${data.map(([name, d], i) => `
                <div class="bar-row">
                    <span class="bar-label">${name}</span>
                    <div class="bar-track">
                        <div class="bar-fill" style="width:${Math.max(d.aum / maxAUM * 100, 8)}%;background:${this.colors[i % this.colors.length]}">
                            <span>${d.count} deals</span>
                        </div>
                    </div>
                    <span class="bar-value">${formatCurrency(d.aum)}</span>
                </div>
            `).join('')}
        </div>`;
    },

    renderBySource(deals) {
        const container = document.getElementById('chartBySource');
        const sourceMap = {};
        deals.forEach(d => {
            const src = d.leadSource || 'Unknown';
            if (!sourceMap[src]) sourceMap[src] = { count: 0, aum: 0 };
            sourceMap[src].count++;
            sourceMap[src].aum += Number(d.estimatedAUM) || 0;
        });

        const data = Object.entries(sourceMap).sort((a, b) => b[1].count - a[1].count);
        const maxCount = Math.max(...data.map(d => d[1].count), 1);

        container.innerHTML = `<div class="bar-chart">
            ${data.map(([name, d], i) => `
                <div class="bar-row">
                    <span class="bar-label">${name}</span>
                    <div class="bar-track">
                        <div class="bar-fill" style="width:${Math.max(d.count / maxCount * 100, 8)}%;background:${this.colors[i % this.colors.length]}">
                            <span>${d.count}</span>
                        </div>
                    </div>
                    <span class="bar-value">${formatCurrency(d.aum)}</span>
                </div>
            `).join('')}
        </div>`;
    },

    renderWeekly() {
        const container = document.getElementById('chartWeekly');
        const allDeals = Store.getDeals();

        // Last 8 weeks of activity
        const weeks = [];
        for (let i = 7; i >= 0; i--) {
            const weekStart = new Date();
            weekStart.setDate(weekStart.getDate() - (i * 7) - weekStart.getDay());
            weekStart.setHours(0, 0, 0, 0);
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekEnd.getDate() + 7);

            const newDeals = allDeals.filter(d => {
                const created = new Date(d.dealCreated);
                return created >= weekStart && created < weekEnd;
            });

            const stageChanges = allDeals.filter(d => {
                const changed = new Date(d.stageChanged);
                return changed >= weekStart && changed < weekEnd && d.stageChanged !== d.dealCreated;
            });

            weeks.push({
                label: `${weekStart.getMonth() + 1}/${weekStart.getDate()}`,
                newDeals: newDeals.length,
                changes: stageChanges.length
            });
        }

        const maxVal = Math.max(...weeks.map(w => w.newDeals + w.changes), 1);

        container.innerHTML = `<div class="bar-chart">
            ${weeks.map((w, i) => `
                <div class="bar-row">
                    <span class="bar-label">Wk ${w.label}</span>
                    <div class="bar-track">
                        <div class="bar-fill" style="width:${Math.max((w.newDeals + w.changes) / maxVal * 100, w.newDeals + w.changes > 0 ? 8 : 0)}%;background:${this.colors[0]}">
                            <span>${w.newDeals} new, ${w.changes} chg</span>
                        </div>
                    </div>
                    <span class="bar-value">${w.newDeals + w.changes} total</span>
                </div>
            `).join('')}
        </div>`;
    }
};
