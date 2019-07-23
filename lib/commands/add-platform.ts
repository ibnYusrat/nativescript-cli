import { ValidatePlatformCommandBase } from "./command-base";

export class AddPlatformCommand extends ValidatePlatformCommandBase implements ICommand {
	public allowedParameters: ICommandParameter[] = [];

	constructor($options: IOptions,
		private $platformCommandHelper: IPlatformCommandHelper,
		$platformValidationService: IPlatformValidationService,
		$projectData: IProjectData,
		$platformsDataService: IPlatformsDataService,
		private $errors: IErrors) {
		super($options, $platformsDataService, $platformValidationService, $projectData);
		this.$projectData.initializeProjectData();
	}

	public async execute(args: string[]): Promise<void> {
		await this.$platformCommandHelper.addPlatforms(args, this.$projectData, this.$options.frameworkPath);
	}

	public async canExecute(args: string[]): Promise<boolean> {
		if (!args || args.length === 0) {
			this.$errors.failWithHelp("No platform specified. Please specify a platform to add.");
		}

		let canExecute = true;
		for (const arg of args) {
			this.$platformValidationService.validatePlatform(arg, this.$projectData);

			if (!this.$platformValidationService.isPlatformSupportedForOS(arg, this.$projectData)) {
				this.$errors.fail(`Applications for platform ${arg} can not be built on this OS`);
			}

			canExecute = await super.canExecuteCommandBase(arg);
		}

		return canExecute;
	}
}

$injector.registerCommand("platform|add", AddPlatformCommand);
