import { cache } from "../common/decorators";
import { ValidatePlatformCommandBase } from "./command-base";

export class DebugPlatformCommand extends ValidatePlatformCommandBase implements ICommand {
	public allowedParameters: ICommandParameter[] = [];

	constructor(private platform: string,
		protected $devicesService: Mobile.IDevicesService,
		$platformValidationService: IPlatformValidationService,
		$projectData: IProjectData,
		$options: IOptions,
		$platformsDataService: IPlatformsDataService,
		$cleanupService: ICleanupService,
		protected $logger: ILogger,
		protected $errors: IErrors,
		private $debugDataService: IDebugDataService,
		private $debugController: IDebugController,
		private $liveSyncCommandHelper: ILiveSyncCommandHelper,
		private $androidBundleValidatorHelper: IAndroidBundleValidatorHelper,
		private $migrateController: IMigrateController) {
		super($options, $platformsDataService, $platformValidationService, $projectData);
		$cleanupService.setShouldDispose(false);
	}

	public async execute(args: string[]): Promise<void> {
		await this.$devicesService.initialize({
			platform: this.platform,
			deviceId: this.$options.device,
			emulator: this.$options.emulator,
			skipDeviceDetectionInterval: true
		});

		const selectedDeviceForDebug = await this.$devicesService.pickSingleDevice({
			onlyEmulators: this.$options.emulator,
			onlyDevices: this.$options.forDevice,
			deviceId: this.$options.device
		});

		if (this.$options.start) {
			const debugOptions = <IDebugOptions>_.cloneDeep(this.$options.argv);
			const debugData = this.$debugDataService.getDebugData(selectedDeviceForDebug.deviceInfo.identifier, this.$projectData, debugOptions);
			await this.$debugController.printDebugInformation(await this.$debugController.startDebug(debugData));
			return;
		}

		await this.$liveSyncCommandHelper.executeLiveSyncOperation([selectedDeviceForDebug], this.platform, {
			deviceDebugMap: {
				[selectedDeviceForDebug.deviceInfo.identifier]: true
			},
			buildPlatform: undefined,
			skipNativePrepare: false
		});
	}

	public async canExecute(args: string[]): Promise<ICanExecuteCommandOutput> {
		if (!this.$options.force) {
			await this.$migrateController.validate({ projectDir: this.$projectData.projectDir, platforms: [this.platform] });
		}

		this.$androidBundleValidatorHelper.validateNoAab();

		if (!this.$platformValidationService.isPlatformSupportedForOS(this.platform, this.$projectData)) {
			this.$errors.failWithoutHelp(`Applications for platform ${this.platform} can not be built on this OS`);
		}

		if (this.$options.release) {
			this.$errors.failWithHelp("--release flag is not applicable to this command.");
		}

		const result = await super.canExecuteCommandBase(this.platform, { validateOptions: true, notConfiguredEnvOptions: { hideCloudBuildOption: true, hideSyncToPreviewAppOption: true } });
		return result;
	}
}

export class DebugIOSCommand implements ICommand {

	@cache()
	private get debugPlatformCommand(): DebugPlatformCommand {
		return this.$injector.resolve<DebugPlatformCommand>(DebugPlatformCommand, { platform: this.platform });
	}

	public allowedParameters: ICommandParameter[] = [];

	constructor(protected $errors: IErrors,
		private $devicePlatformsConstants: Mobile.IDevicePlatformsConstants,
		private $platformValidationService: IPlatformValidationService,
		private $options: IOptions,
		private $injector: IInjector,
		private $sysInfo: ISysInfo,
		private $projectData: IProjectData,
		$iosDeviceOperations: IIOSDeviceOperations,
		$iOSSimulatorLogProvider: Mobile.IiOSSimulatorLogProvider) {
		this.$projectData.initializeProjectData();
		// Do not dispose ios-device-lib, so the process will remain alive and the debug application (NativeScript Inspector or Chrome DevTools) will be able to connect to the socket.
		// In case we dispose ios-device-lib, the socket will be closed and the code will fail when the debug application tries to read/send data to device socket.
		// That's why the `$ tns debug ios --justlaunch` command will not release the terminal.
		// In case we do not set it to false, the dispose will be called once the command finishes its execution, which will prevent the debugging.
		$iosDeviceOperations.setShouldDispose(false);
		$iOSSimulatorLogProvider.setShouldDispose(false);
	}

	public execute(args: string[]): Promise<void> {
		return this.debugPlatformCommand.execute(args);
	}

	public async canExecute(args: string[]): Promise<ICanExecuteCommandOutput> {
		if (!this.$platformValidationService.isPlatformSupportedForOS(this.$devicePlatformsConstants.iOS, this.$projectData)) {
			this.$errors.failWithoutHelp(`Applications for platform ${this.$devicePlatformsConstants.iOS} can not be built on this OS`);
		}

		const isValidTimeoutOption = this.isValidTimeoutOption();
		if (!isValidTimeoutOption) {
			this.$errors.failWithoutHelp(`Timeout option must be a number.`);
		}

		if (this.$options.inspector) {
			const macOSWarning = await this.$sysInfo.getMacOSWarningMessage();
			if (macOSWarning && macOSWarning.severity === SystemWarningsSeverity.high) {
				this.$errors.failWithoutHelp(`You cannot use NativeScript Inspector on this OS. To use it, please update your OS.`);
			}
		}
		const result = await this.debugPlatformCommand.canExecute(args);
		return result;
	}

	private isValidTimeoutOption() {
		if (!this.$options.timeout) {
			return true;
		}

		const timeout = parseInt(this.$options.timeout, 10);
		if (timeout === 0) {
			return true;
		}

		if (!timeout) {
			return false;
		}

		return true;
	}

	public platform = this.$devicePlatformsConstants.iOS;
}

$injector.registerCommand("debug|ios", DebugIOSCommand);

export class DebugAndroidCommand implements ICommand {

	@cache()
	private get debugPlatformCommand(): DebugPlatformCommand {
		return this.$injector.resolve<DebugPlatformCommand>(DebugPlatformCommand, { platform: this.platform });
	}

	public allowedParameters: ICommandParameter[] = [];

	constructor(protected $errors: IErrors,
		private $devicePlatformsConstants: Mobile.IDevicePlatformsConstants,
		private $injector: IInjector,
		private $projectData: IProjectData) {
		this.$projectData.initializeProjectData();
	}

	public execute(args: string[]): Promise<void> {
		return this.debugPlatformCommand.execute(args);
	}
	public async canExecute(args: string[]): Promise<ICanExecuteCommandOutput> {
		const result = await this.debugPlatformCommand.canExecute(args);
		return result;
	}

	public platform = this.$devicePlatformsConstants.Android;
}

$injector.registerCommand("debug|android", DebugAndroidCommand);
