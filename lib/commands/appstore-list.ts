import { createTable } from "../common/helpers";
import { StringCommandParameter } from "../common/command-params";

export class ListiOSApps implements ICommand {
	public allowedParameters: ICommandParameter[] = [new StringCommandParameter(this.$injector), new StringCommandParameter(this.$injector)];

	constructor(private $injector: IInjector,
		private $applePortalApplicationService: IApplePortalApplicationService,
		private $logger: ILogger,
		private $projectData: IProjectData,
		private $devicePlatformsConstants: Mobile.IDevicePlatformsConstants,
		private $platformValidationService: IPlatformValidationService,
		private $errors: IErrors,
		private $prompter: IPrompter) {
		this.$projectData.initializeProjectData();
	}

	public async execute(args: string[]): Promise<void> {
		if (!this.$platformValidationService.isPlatformSupportedForOS(this.$devicePlatformsConstants.iOS, this.$projectData)) {
			this.$errors.fail(`Applications for platform ${this.$devicePlatformsConstants.iOS} can not be built on this OS`);
		}

		let username = args[0];
		let password = args[1];

		if (!username) {
			username = await this.$prompter.getString("Apple ID", { allowEmpty: false });
		}

		if (!password) {
			password = await this.$prompter.getPassword("Apple ID password");
		}

		const applications = await this.$applePortalApplicationService.getApplications({ username, password });

		if (!applications || !applications.length) {
			this.$logger.info("Seems you don't have any applications yet.");
		} else {
			const table: any = createTable(["Application Name", "Bundle Identifier", "In Flight Version"], applications.map(application => {
				const version = (application && application.versionSets && application.versionSets.length && application.versionSets[0].inFlightVersion && application.versionSets[0].inFlightVersion.version) || "";
				return [application.name, application.bundleId, version];
			}));

			this.$logger.info(table.toString());
		}
	}
}

$injector.registerCommand("appstore|*list", ListiOSApps);
