///<reference path="../../.d.ts"/>
"use strict";

import options = require("../options");
import hostInfo = require("../host-info");
import util = require("util");

export class PostInstallCommand implements ICommand {
	private static SEVEN_ZIP_ERROR_MESSAGE = "It looks like there's a problem with your system configuration. " +
		"You can find all system requirements on %s"; 

	constructor(private $autoCompletionService: IAutoCompletionService,
		private $fs: IFileSystem,
		private $staticConfig: Config.IStaticConfig,
		private $childProcess: IChildProcess,
		private $errors: IErrors) {
	}

	public disableAnalytics = true;
	public allowedParameters: ICommandParameter[] = [];

	public execute(args: string[]): IFuture<void> {
		return (() => {
			if(process.platform !== "win32") {
				// when running under 'sudo' we create a working dir with wrong owner (root) and it is no longer accessible for the user initiating the installation
				// patch the owner here
				if (process.env.SUDO_USER) {
					this.$fs.setCurrentUserAsOwner(options.profileDir, process.env.SUDO_USER).wait();
				}
			}

			this.$autoCompletionService.enableAutoCompletion().wait();
			this.checkSevenZip().wait();
		}).future<void>()();
	}

	private checkSevenZip(): IFuture<void> {
		return (() => {
			var sevenZipErrorMessage = util.format(PostInstallCommand.SEVEN_ZIP_ERROR_MESSAGE, this.$staticConfig.SYS_REQUIREMENTS_LINK);
			try {
				var proc = this.$childProcess.spawnFromEvent(this.$staticConfig.sevenZipFilePath, ["-h"], "exit", undefined, { throwError: false }).wait();

				if(proc.stderr) {
					this.$errors.failWithoutHelp(sevenZipErrorMessage);
				}
			} catch(e) {
				var message: string = (e.code === "ENOENT") ? sevenZipErrorMessage : e.message;
				this.$errors.failWithoutHelp(message);
			}
		}).future<void>()();
	}
}
$injector.registerCommand("dev-post-install", PostInstallCommand);
