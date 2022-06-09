import { Injectable } from '@angular/core';
import { marker as _ } from '@biesbjerg/ngx-translate-extract-marker';
import { TranslateService } from '@ngx-translate/core';
import { StorageService } from 'src/app/gateways/storage.service';
import { Deferred } from 'src/app/infrastructure/utils/promises';
import { BaseSortListService, OsSortingDefinition, OsSortingOption } from 'src/app/site/base/base-sort.service';
import { MeetingSettingsService } from 'src/app/site/pages/meetings/services/meeting-settings.service';

import { ViewMotion } from '../../../view-models';
import { MotionsListServiceModule } from '../motions-list-service.module';

@Injectable({
    providedIn: MotionsListServiceModule
})
export class MotionListSortService extends BaseSortListService<ViewMotion> {
    /**
     * set the storage key name
     */
    protected storageKey = `MotionList`;

    /**
     * Hold the default motion sorting
     */
    private defaultMotionSorting: string;

    /**
     * To wait until the default motion was loaded once
     */
    private readonly defaultSortingLoaded: Deferred<void> = new Deferred();

    /**
     * Define the sort options
     */
    protected motionSortOptions: OsSortingOption<ViewMotion>[] = [
        { property: `sort_weight`, label: `Call list` },
        { property: `number` },
        { property: `title` },
        { property: `submitters` },
        { property: `category`, sortFn: this.categorySortFn },
        { property: `block_id`, label: `Motion block` },
        { property: `state` },
        { property: `creationDate`, label: _(`Creation date`) },
        { property: `lastChangeDate`, label: _(`Last modified`) }
    ];

    /**
     * Constructor.
     *
     * @param translate required by parent
     * @param store required by parent
     * @param config set the default sorting according to OpenSlides configuration
     */
    public constructor(
        protected override translate: TranslateService,
        store: StorageService,
        private meetingSettingsService: MeetingSettingsService
    ) {
        super(translate, store);

        this.defaultMotionSorting = `number`;
        this.defaultSortingLoaded.resolve();

        this.meetingSettingsService.get(`motions_default_sorting`).subscribe(defSortProp => {
            if (defSortProp) {
                this.defaultMotionSorting = defSortProp;
                this.defaultSortingLoaded.resolve();
            }
        });
    }

    protected getSortOptions(): OsSortingOption<ViewMotion>[] {
        return this.motionSortOptions;
    }

    /**
     * Required by parent
     *
     * @returns the default sorting strategy
     */
    protected async getDefaultDefinition(): Promise<OsSortingDefinition<ViewMotion>> {
        await this.defaultSortingLoaded;
        return {
            sortProperty: this.defaultMotionSorting as keyof ViewMotion,
            sortAscending: true
        };
    }

    /**
     * Custom function to sort the categories by the `category_weight` of the motion.
     *
     * @param itemA The first item to sort
     * @param itemB The second item to sort
     * @param ascending If the sorting should be in ascended or descended order
     *
     * @returns {number} The result of comparing.
     */
    private categorySortFn(itemA: ViewMotion, itemB: ViewMotion, ascending: boolean): number {
        if (itemA.category_id === itemB.category_id) {
            return itemA.category_weight < itemB.category_weight === ascending ? -1 : 1;
        } else {
            return itemA.category!.weight < itemB.category!.weight === ascending ? -1 : 1;
        }
    }
}