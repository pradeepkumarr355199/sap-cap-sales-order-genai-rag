const cds = require('@sap/cds');

module.exports = cds.service.impl(async function () {

    const { SalesOrders } = this.entities;

    this.before('CREATE', 'SalesOrders', async (req) => {

        const items = req.data.Items;

        if (items && items.length > 0) {

            let total = 0;

            for (const item of items) {

                // 🚨 VALIDATION LOGIC
                if (!item.KWMENG || item.KWMENG <= 0) {
                    req.error(400, `Invalid Quantity for item ${item.POSNR}`);
                }

                if (!item.NETPR || item.NETPR <= 0) {
                    req.error(400, `Invalid Price for item ${item.POSNR}`);
                }

                total += item.KWMENG * item.NETPR;
            }

            req.data.NETWR = total;
        }
    });

});
