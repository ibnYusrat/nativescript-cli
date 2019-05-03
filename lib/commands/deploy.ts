import { ANDROID_RELEASE_BUILD_ERROR_MESSAGE } from "../constants";
import { ValidatePlatformCommandBase } from "./command-base";

export class DeployOnDeviceCommand extends ValidatePlatformCommandBase implements ICommand {
	public allowedParameters: ICommandParameter[] = [];

	constructor($platformValidationService: IPlatformValidationService,
		private $platformCommandParameter: ICommandParameter,
		$options: IOptions,
		$projectData: IProjectData,
		private $errors: IErrors,
		private $mobileHelper: Mobile.IMobileHelper,
		$platformsData: IPlatformsData,
		private $bundleValidatorHelper: IBundleValidatorHelper,
		private $liveSyncCommandHelper: ILiveSyncCommandHelper,
		private $androidBundleValidatorHelper: IAndroidBundleValidatorHelper) {
			super($options, $platformsData, $platformValidationService, $projectData);
			this.$projectData.initializeProjectData();
	}

	public async execute(args: string[]): Promise<void> {
		const platform = args[0].toLowerCase();
		// TODO: Add a separate deployCommandHelper with base class for it and LiveSyncCommandHelper
		await this.$liveSyncCommandHelper.executeCommandLiveSync(platform, <any>{ release: true });
	}

	public async canExecute(args: string[]): Promise<boolean | ICanExecuteCommandOutput> {
		this.$androidBundleValidatorHelper.validateNoAab();
		this.$bundleValidatorHelper.validate();
		if (!args || !args.length || args.length > 1) {
			return false;
		}

		if (!(await this.$platformCommandParameter.validate(args[0]))) {
			return false;
		}

		if (this.$mobileHelper.isAndroidPlatform(args[0]) && this.$options.release && (!this.$options.keyStorePath || !this.$options.keyStorePassword || !this.$options.keyStoreAlias || !this.$options.keyStoreAliasPassword)) {
			this.$errors.fail(ANDROID_RELEASE_BUILD_ERROR_MESSAGE);
		}

		const result = await super.canExecuteCommandBase(args[0], { validateOptions: true });
		return result;
	}
}

$injector.registerCommand("deploy", DeployOnDeviceCommand);
