import {PluginsSourceBase} from "./plugins-source-base";
import Future = require("fibers/future");

export class NpmRegistryPluginsSource extends PluginsSourceBase implements IPluginsSource {
	constructor($progressIndicator: IProgressIndicator,
		$logger: ILogger,
		private $httpClient: Server.IHttpClient,
		private $childProcess: IChildProcess,
		private $hostInfo: IHostInfo,
		private $npmService: INpmService,
		private $errors: IErrors) {
		super($progressIndicator, $logger);
	}

	protected get progressIndicatorMessage(): string {
		return "Searching for plugin in http://registry.npmjs.org.";
	}

	public getPlugins(page: number, count: number): IFuture<IBasicPluginInformation[]> {
		return Future.fromResult(page === 1 ? this.plugins : null);
	}

	protected initializeCore(projectDir: string, keywords: string[]): IFuture<void> {
		return (() => {
			let plugin = this.getPluginFromNpmRegistry(keywords[0]).wait();
			this.plugins = plugin ? [plugin] : null;
		}).future<void>()();
	}

	private prepareScopedPluginName(plugin: string): string {
		return plugin.replace("/", "%2F");
	}

	private getPluginFromNpmRegistry(plugin: string): IFuture<IBasicPluginInformation> {
		return ((): IBasicPluginInformation => {
			let dependencyInfo = this.$npmService.getDependencyInformation(plugin);

			let pluginName = this.$npmService.isScopedDependency(plugin) ? this.prepareScopedPluginName(dependencyInfo.name) : dependencyInfo.name;

			let result = this.$npmService.getPackageJsonFromNpmRegistry(pluginName, dependencyInfo.version).wait();

			if (!result) {
				return null;
			}

			result.author = result.author.name || result.author;
			return result;
		}).future<IBasicPluginInformation>()();
	}
}