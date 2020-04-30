import { Injectable } from '@angular/core';
import { HttpClient, HttpResponse, HttpErrorResponse, HttpParams, HttpHeaders } from '@angular/common/http';

import { UBS } from './ubs/ubs.model';
import { Observable, throwError, empty } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class UbsService {

  requestUrl = "https://medidor.rnp.br/ubs/";
  saveUrl = "https://medidor.rnp.br/save";

  constructor(private _http: HttpClient) { }

  getUbs(id: string): Observable<HttpResponse<UBS>> {
    return this._http.get<UBS>(this.requestUrl + id, { observe: 'response' }).pipe(catchError(this.handleError));
  }

  //It should be this way, but it doesnt work
  /*saveResults(testResults: string) {
    console.log(testResults);
    return this._http.jsonp(this.saveUrl + "?data=" + testResults, 'response').pipe(catchError(this.handleError));
  }*/

  saveResults(testResults: string) {
    var header = new HttpHeaders({ 'Accept': 'text/javascript, application/javascript, application/ecmascript, application/x-ecmascript, */*; q=0.01', 'Content-Type': 'application/json'});
    let url = this.saveUrl + "?callback=response&" + testResults;
    return this._http.request<any>('GET', url, {
      headers: header,
      params: new HttpParams().append('_', Date.now().toString()),
      observe: 'body',
      responseType: 'json',
    }).pipe(catchError(this.handleError));
  }

  private handleError(error: HttpErrorResponse) {
    if (error.error instanceof ErrorEvent) {
      console.error('A client error occurred:', error.error.message);
    } else {
      // The backend returned an unsuccessful response code.
      // The response body may contain clues as to what went wrong,
      if (error.status == 200) {
        console.log("Not an error");
        return empty();
      }
      console.error(
        `Backend returned code ${error.status}, ` +
        `body was: ${error.error}`);
    }
    return throwError(error);
  }
}
