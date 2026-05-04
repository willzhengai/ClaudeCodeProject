// === Pipeline Board View ===

const Pipeline = {
    render() {
        const board = document.getElementById('pipelineBoard');
        let deals = Store.getDeals();

        // Permission filter
        if (!ROLES[Auth.currentUser.role].canViewAll) {
            deals = deals.filter(d => d.advisorId === Auth.currentUser.id || d.createdBy === Auth.currentUser.id);
        }

        board.innerHTML = DEAL_STAGES.map(stage => {
            const stageDeals = deals.filter(d => d.dealStage === stage.id);
            const totalAUM = stageDeals.reduce((sum, d) => sum + (Number(d.estimatedAUM) || 0), 0);

            return `<div class="pipeline-column" data-stage="${stage.id}">
                <div class="pipeline-column-header">
                    <span>${stage.label}</span>
                    <span class="count">${stageDeals.length}</span>
                </div>
                ${stageDeals.map(d => `
                    <div class="pipeline-card" onclick="Deals.edit('${d.id}')">
                        <div class="pc-company">${Deals.escHtml(d.companyName)}</div>
                        <div class="pc-aum">${formatCurrency(d.estimatedAUM)}</div>
                        <div class="pc-advisor">${Deals.escHtml(d.advisorName || '')}</div>
                    </div>
                `).join('')}
                <div class="pipeline-total">Total: ${formatCurrency(totalAUM)}</div>
            </div>`;
        }).join('');
    }
};
