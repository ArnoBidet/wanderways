import { Component, Input, OnInit, SimpleChanges } from '@angular/core';
import { DataSubjectService } from 'src/app/shared/services/map-specific/data-subject.service';
import { StringFactory } from 'src/app/shared/utils/factories/string.factory';
import { Area } from '../../../../utils/interfaces/map-oriented/area';
import {animate, state, style, transition, trigger} from '@angular/animations';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-area-table',
  templateUrl: './area-table.component.html',
  styleUrls: ['./area-table.component.scss'],
  animations: [
    trigger('detailExpand', [
      state('collapsed', style({height: '0px', minHeight: '0'})),
      state('expanded', style({height: '*'})),
      transition('expanded <=> collapsed', animate('225ms cubic-bezier(0.4, 0.0, 0.2, 1)')),
    ]),
  ],
})
export class AreaTableComponent implements OnInit {

	@Input() inGameMode : boolean = false;

	@Input() dataSourceInput : Area[] = [];

	@Input() currentDataInput : Area | undefined = undefined;

	displayedColumns : string[]=['numero', 'departement'];
	expandedElement: Area | null = null;
	displayedElements : Map<string, boolean> = new Map<string,boolean>();

	private subscriptions : {[key: string]: Subscription} = {};

	constructor(private dataSubjectService : DataSubjectService) { }

  	ngOnInit(): void {
		this.dataSubjectService.getCurrentDataChange().subscribe(value=>this.processCurrentDataChange(value));
	}

	/**
	 * Watch if any input value change, and act accordingly
	 * @param changes A change that occured
	 */
	ngOnChanges(changes: SimpleChanges) {
		if(changes.dataSourceInput)this.processSourceDataChange(changes.dataSourceInput.currentValue);
		if(changes.currentDataInput)this.processCurrentDataChange(changes.currentDataInput?.currentValue)
    }

	ngOnDestroy(){
		// Unsubscribe from all registered subscriptions
		Object.keys(this.subscriptions).forEach((key : string) => {
			this.subscriptions[key].unsubscribe();
		});
	}

	/**
	 * Processes the source data changes. If in game, then hide all. Else display all
	 * @param value : The current data list
	 */
	private processSourceDataChange(value : any[]): void{
		this.dataSourceInput=value;
		// We set all elements as visible
		this.dataSourceInput.forEach((value)=>{this.displayedElements.set(value.num, true)});
		//Si on est en mode jeu, alors on cache toutes les données, et on surveille l'avancé du tableau de résultat
		if(this.inGameMode){
			this.hideAllContent();
		}
	}

	/**
	 * Processes the current data changes. Display the data in it.
	 * @param value : An area
	 */
	private processCurrentDataChange(value:any): void{
		this.displayByContentId(value);
	}

	/**
	 * Gives the row its visibility property
	 * @param rowidentifier : The row identifier
	 * @returns True if element must be displayed, false otherwise
	 */
	isRowVisible( rowidentifier : string ): boolean | undefined{
		return this.displayedElements.get(rowidentifier);
	}

	/**
	 * Gives the row its visibility property
	 * @param rowidentifier : The row identifier
	 * @returns True if element must be displayed, false otherwise
	 */
	isRowColored(rowidentifier : string ): boolean{
		return this.expandedElement?.num == rowidentifier;
	}

	/**
	 * Replace accented char by their ascii equivalent. To lower case and space replaced by hyphen.
	 * @param str : A string to normalise
	 * @returns The normalized string
	 */
	replaceSpecialChars(str : string): string{
		return new StringFactory().replaceSpecialChars(str);
	}

	/**
	 * Hide all content from table, with placeholder
	 */
	hideAllContent(): void{
		this.dataSourceInput.forEach((value)=>{this.displayedElements.set(value.num, false)})
	}
	/**
	 * Display all content from table,
	 */
	displayAllContent(): void{
		this.dataSourceInput.forEach((value)=>{this.displayedElements.set(value.num, true)})
	}

	/**
	 * Hide specific content, with placeholder
	 * @param id : 
	 */
	hideByContentId(id : string): void{
		this.displayedElements.set(id, false)
	}

	/**
	 * Display specific content
	 * @param id : 
	 */
	 displayByContentId(area : Area): void{
		this.scrollToElement(area);
		this.displayedElements.set(area?.num, true);
	}

	/**
	 * Makes the table scroll to the specified element of the list
	 * @param id : The id of one of the list elements
	 * @todo use directives to make elements ref self log
	 */
	scrollToElement(area : Area): void{
		document.getElementById("element-"+area?.num)?.scrollIntoView({block: 'center'});
		this.listElementExpanded(area);
	}

	/**
	 * Expands a given element and launch node customizations process
	 * @param area : An area that has been selected
	 */
	listElementExpanded(area : Area){
		if(area != this.expandedElement){ // Avoids loop and make it so you cannot shrink selected content in list
			this.expandedElement = this.expandedElement === area ? null : area;
			this.dataSubjectService.setCurrentDataValue(area);
		}
	}
}
