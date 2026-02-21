const cds = require('@sap/cds');

module.exports = cds.service.impl(async function () {

    const { SalesOrders } = this.entities;

    this.before('CREATE', 'SalesOrders', async (req) => {

        const items = req.data.Items;

        if (!items || items.length === 0) {
            req.error(400, 'Sales order must contain at least one item');
        }

        let total = 0;

        for (const item of items) {

            // 🔹 VALIDATION
            if (!item.KWMENG || item.KWMENG <= 0) {
                req.error(400, `Invalid Quantity for item ${item.POSNR}`);
            }

            if (!item.NETPR || item.NETPR <= 0) {
                req.error(400, `Invalid Price for item ${item.POSNR}`);
            }

            total += item.KWMENG * item.NETPR;
        }

        // 🔹 DISCOUNT ENGINE
        if (total > 10000) {
            const discount = total * 0.05;
            total = total - discount;

            console.log(`Discount applied: ${discount}`);
        }

        req.data.NETWR = total;
    });

});
