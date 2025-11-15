const { Client } = require('@notionhq/client');
const formattedDataBeforeSetDataForNotion = require('../utils/formattedDataBeforeSetDataForNotion.js');

class NotionService {
    constructor() {
        this.notion = new Client({ auth: process.env.NOTION_TOKEN });
        this.budgetTracker = process.env.NOTION_BUDGET_TRACKER_DB_ID;
    }

    async getData(databaseId, filter = {}, sorts = []) {
        try {
            if (!databaseId) throw new Error('Database ID is required');

            return await this.notion.databases.retrieve({
                database_id: databaseId,
                filter,
                sorts,
            });
        } catch (error) {
            console.error('Error querying Notion database:', error);
            return null;
        }
    }

    async setData(formattedData) {
        try {
            const response = await this.getData(this.budgetTracker, {
                property: 'Transaction ID',
                title: {
                    equals: formattedData.properties['Transaction ID']
                        .rich_text[0].plain_text,
                },
            });

            if (response?.results?.length > 0) {
                return;
            }

            return await this.notion.pages.create(formattedData);
        } catch (error) {
            console.error('Error creating Notion page:', error);
            return null;
        }
    }

    async setDataForBudgetTracker(body) {
        try {
            if (!body) throw new Error('Body data is required');

            return await this.setData(
                formattedDataBeforeSetDataForNotion(this.budgetTracker, body),
            );
        } catch (error) {
            console.error('Error setting data for Budget Tracker:', error);
            return null;
        }
    }
}

module.exports = new NotionService();
