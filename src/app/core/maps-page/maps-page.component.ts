import { Component, OnInit } from '@angular/core';
import { MapGroup } from 'src/app/shared/interfaces/map-group.interface';
import { MapGroupService } from 'src/app/shared/services/map-group/map-group.service';
import { Tag } from 'src/app/shared/interfaces/tag.interface';
import { MapTagsService } from 'src/app/shared/services/map-tags/map-tags.service';
import { TagGroup } from 'src/app/shared/interfaces/tag-group.interface';
import { TagGroupService } from 'src/app/shared/services/tag-group/tag-group.service';

@Component({
  selector: 'app-maps-page',
  templateUrl: './maps-page.component.html',
  styleUrls: ['./maps-page.component.scss']
})
export class MapsPageComponent implements OnInit {

  tagGroupList : TagGroup[] = [];

  mapTagList : Tag[] = [];

  mapGroupList : MapGroup[] = [];

  displayFilter : boolean = false;
  tagFilterList : Tag[]=[];

  constructor(private mapGroupService : MapGroupService,
              public mapTagsService : MapTagsService,
              private TagGroupService : TagGroupService) {}

  /**
   * On component init
   */
  ngOnInit(): void {
    this.mapGroupService.loadIndex().subscribe((e:MapGroup[])=>this.mapGroupList = e);
    this.TagGroupService.loadTagGroup().subscribe((e : TagGroup[])=>this.onTagGroupsLoaded(e));
    this.mapTagsService.loadTags().subscribe((e : Tag[])=>this.onMapTagsLoaded(e));
  }
  /**
   * When map index are loaded, affect them to component index
   * @param mapGroupList The loaded index
   */
  onTagGroupsLoaded(tagGroupList : TagGroup[]){
    this.tagGroupList = tagGroupList;
  }
  /**
   * When map index are loaded, affect them to component index
   * @param mapGroupList The loaded index
   */
  onMapIndexLoaded(mapGroupList : MapGroup[]){
    this.mapGroupList = mapGroupList;
  }
  /**
   * When map tags are loaded, affect them to component tags list
   * @param mapGroupList The loaded tags list
   */
  onMapTagsLoaded(mapTagList : Tag[]){
    this.mapTagList = mapTagList;
  }

  /**
   * Checks wheter or not a map has a given tag
   * @param mapGroup The map to check
   * @param tag The tag to test
   * @returns True if the map has the given tag, false otherwise
   */
  entryHasTag(mapGroup : MapGroup, tag : string) : boolean{
    return mapGroup.tagIdList.some(e=>e === tag);
  }

  /**
   * Checks wheter or not a map has a given tag
   * @param mapGroup The map to check
   * @param tag The tag to test
   * @returns True if the map has the given tag, false otherwise
   */
  tagHasMap(mapTag : Tag, mapGroup :MapGroup[]) : boolean {
    return mapGroup.some((e : MapGroup) => (this.entryHasTag(e, mapTag.id)));
  }
  /**
   * Check wheter a given tag is in filtered tag list and is active
   * @param mapTag A tag to test
   * @returns True if the tag is in filter tag list and active, false otherwise
   */
  isTagFiltered(mapTag : Tag) : boolean{
    return this.tagFilterList.some(e=> mapTag.id===e.id);
  }

  /**
   * Adjust the current tag list filter
   * @param tagFilterList The new tag list filter
   */
  currentTagListHandler(tagFilterList : Tag[]){
    this.tagFilterList = tagFilterList;
  }
}