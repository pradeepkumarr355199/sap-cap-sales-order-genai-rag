const cds = require('@sap/cds');

module.exports = cds.service.impl(async function () {

    const { SalesOrders } = this.entities;

    this.before('CREATE', 'SalesOrders', async (req) => {

        const items = req.data.Items;

        if (items && items.length > 0) {

            let total = 0;

            for (const item of items) {
                total += (item.KWMENG || 0) * (item.NETPR || 0);
            }

            req.data.NETWR = total;
        }
    });

});
