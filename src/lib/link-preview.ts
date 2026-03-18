// src/lib/link-preview.ts

import fetch from 'node-fetch';

interface OpenGraphData {
    title?: string;
    type?: string;
    image?: string;
    url?: string;
    description?: string;
}

const fetchOpenGraphData = async (url: string): Promise<OpenGraphData> => {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const text = await response.text();
        const regex = /<meta property="og:(.*?)" content="(.*?)"/g;
        const ogData: OpenGraphData = {};
        let match;

        while ((match = regex.exec(text)) !== null) {
            ogData[match[1]] = match[2];
        }

        return ogData;
    } catch (error) {
        console.error(`Error fetching Open Graph data: ${error}`);
        return {} as OpenGraphData;
    }
};

export default fetchOpenGraphData;
