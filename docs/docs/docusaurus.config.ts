import { themes as prismThemes } from 'prism-react-renderer';
import type { Config } from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
	title: 'Web3 zkSync Plugin',
	tagline: 'Plugin to interact with the zkSync network using the web3.js library',
	favicon: 'img/puzzle.png',

	// Set the production url of your site here
	url: 'https://your-docusaurus-site.example.com',
	// Set the /<baseUrl>/ pathname under which your site is served
	// For GitHub pages deployment, it is often '/<projectName>/'
	baseUrl: '/',

	// GitHub pages deployment config.
	// If you aren't using GitHub pages, you don't need these.
	organizationName: 'ChainSafe', // Usually your GitHub org/user name.
	projectName: 'web3-plugin-zksync', // Usually your repo name.

	onBrokenLinks: 'throw',
	onBrokenMarkdownLinks: 'warn',

	// Even if you don't use internationalization, you can use this field to set
	// useful metadata like html lang. For example, if your site is Chinese, you
	// may want to replace "en" with "zh-Hans".
	i18n: {
		defaultLocale: 'en',
		locales: ['en'],
	},

	presets: [
		[
			'classic',
			{
				docs: {
					sidebarPath: './sidebars.ts',
					// Please change this to your repo.
					// Remove this to remove the "edit this page" links.
					editUrl: 'https://github.com/ChainSafe/web3-plugin-zksync',
				},
				theme: {
					customCss: './src/css/custom.css',
				},
			} satisfies Preset.Options,
		],
	],

	themeConfig: {
		// Replace with your project's social card
		image: 'img/docusaurus-social-card.jpg',
		navbar: {
			hideOnScroll: true,
			logo: {
				alt: 'web3.js logo',
				src: '/img/web3js.svg',
			},
			items: [
				{
					type: 'docSidebar',
					sidebarId: 'tutorialSidebar',
					position: 'left',
					label: 'Docs',
				},
				{
					href: 'https://github.com/ChainSafe/web3-plugin-zksync',
					label: 'GitHub',
					position: 'right',
				},
			],
		},
		footer: {
			style: 'dark',
			links: [
				{
					title: 'Discord',
					items: [
						{
							label: '🧡 Web3.js Discord',
							href: 'https://discord.gg/3shNX8cqGR',
						},
						{
							label: '🤍 zkSync Discord',
							href: 'https://discord.com/invite/qYfDvjW',
						},
					],
				},
				{
					title: 'Twitter',
					items: [
						{
							label: '🧡 Web3.js Twitter',
							href: 'https://twitter.com/web3_js',
						},
						{
							label: '🤍 zkSync Devs Twitter',
							href: 'https://twitter.com/zkSyncDevs',
						},
					],
				},
			],
			copyright: `Made by ChainSafe Systems ®`,
		},
		prism: {
			theme: prismThemes.github,
			darkTheme: prismThemes.dracula,
		},
	} satisfies Preset.ThemeConfig,
};

export default config;
