import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { GameModeMetaData } from './game-mode-mode-meta-data.interface';

@Injectable({
  providedIn: 'root'
})
export class GameModeMetaDataService {

  private gameModeMetaData : GameModeMetaData = {
    game_mode_name : "undefined",
    game_mode_rules : "undefined"
  }
  private gameModeMetaDataChange : Subject<GameModeMetaData> = new Subject<GameModeMetaData>()

  constructor() { }

  /**
   * Permet de mettre à jour la valeur des métas données
   * @param mapMetadata : Une instance valide du type "GameModeMetadata"
   */
   setGameMetaData(gameModeMetadata : GameModeMetaData){
		setTimeout(() => { this.gameModeMetaDataChange.next(gameModeMetadata); });
  }

  /**
   * Permet d'obtenir les métas données de la gamemode
   * @returns 
   */
  getGameModeMetaData(){
    return this.gameModeMetaData;
  }

   /**
   * Permet d'obtenir l'abonnement au changement des métas données
   * @returns 
   */
    getGameModeMetaDataChange(){
      return this.gameModeMetaDataChange;
    }
}
