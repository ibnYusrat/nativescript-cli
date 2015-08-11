///<reference path=".d.ts"/>
"use strict";

import * as path from "path";

export class ResourceLoader implements IResourceLoader {
	constructor(private $fs: IFileSystem,
		private $staticConfig: Config.IStaticConfig) { }

	resolvePath(resourcePath: string): string {
		return path.join(__dirname, "../../resources", resourcePath);
	}

	openFile(resourcePath: string): NodeJS.ReadableStream {
		return this.$fs.createReadStream(this.resolvePath(resourcePath));
	}

	readJson(resourcePath: string): IFuture<any> {
		return this.$fs.readJson(this.resolvePath(resourcePath));
	}

	public getPathToAppResources(framework: string): string {
		return path.join(this.resolvePath(framework), this.$staticConfig.APP_RESOURCES_DIR_NAME);
	}
}
$injector.register("resources", ResourceLoader);
